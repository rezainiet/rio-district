import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + database probe for monitoring (nginx, uptime checker, systemd timer).
 * Reveals nothing about the configuration: just "ok" or "degraded".
 */
export async function GET() {
  const started = Date.now();
  try {
    await connectDB();
    await mongoose.connection.db!.command({ ping: 1 }); // allowed for a readWrite-only user
    return Response.json({ status: "ok", db: "up", ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "degraded", db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
