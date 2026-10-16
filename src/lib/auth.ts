import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { AdminSession, AdminUser } from "@/models/misc";
import { SESSION_COOKIE } from "./session-cookie";

export { SESSION_COOKIE };
const SESSION_DAYS = 7;

export type AdminIdentity = { id: string; email: string; name: string; role: string };

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

/** Constant work even when the user doesn't exist, to avoid user enumeration by timing. */
let dummyHash: Promise<string> | null = null;

export async function verifyCredentials(email: string, password: string) {
  await connectDB();
  const user = await AdminUser.findOne({ email: email.toLowerCase(), active: true });
  dummyHash ??= bcrypt.hash(randomBytes(16).toString("hex"), 12);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await dummyHash));
  return ok && user ? user : null;
}

export async function createSession(userId: string, userAgent?: string) {
  await connectDB();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await AdminSession.create({ tokenHash: sha256(token), user: userId, expiresAt, userAgent });
  await AdminUser.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await connectDB();
    await AdminSession.deleteOne({ tokenHash: sha256(token) });
  }
  jar.delete(SESSION_COOKIE);
}

/** Server-side session check. Returns null when not signed in. */
export async function getAdmin(): Promise<AdminIdentity | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  const session = await AdminSession.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  const user = await AdminUser.findOne({ _id: session.user, active: true }).lean();
  if (!user) return null;
  return { id: String(user._id), email: user.email, name: user.name || user.email, role: user.role ?? "owner" };
}

/** For pages: redirects to the login screen when not authenticated. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
