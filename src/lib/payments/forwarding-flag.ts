import "server-only";
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeSync, fsyncSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { HostedCheckoutError, readEverflowConfig } from "./everflow";

function flagPath() {
  if (process.env.APP_ENV === "production") return "/var/lib/rio-district/payment-control/everflow-enabled.env";
  const testDb = process.env.RIO_EVERFLOW_TEST === "true"
    ? /^mongodb:\/\/127\.0\.0\.1:\d+\/(rio_everflow_test_[a-z0-9_]+)(?:\?.*)?$/i.exec(process.env.MONGODB_URI ?? "")?.[1]
    : null;
  return path.resolve(process.cwd(), ".data", "payment-control", testDb ? `${testDb}.env` : "everflow-enabled.env");
}

/** The server-managed flag overrides .env.local and is also loaded by systemd on restarts. */
export function forwardingFlag() {
  const file = flagPath();
  try {
    if (!lstatSync(file).isFile()) throw new Error("Invalid payment control file.");
    const value = readFileSync(file, "utf8").trim();
    if (value === "EVERFLOW_ENABLED=true") return { enabled: true, source: "server-file" as const };
    if (value === "EVERFLOW_ENABLED=false") return { enabled: false, source: "server-file" as const };
    throw new Error("Invalid payment control value.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { enabled: process.env.EVERFLOW_ENABLED === "true", source: "environment" as const };
    // A damaged or unreadable control file must never enable forwarding.
    return { enabled: false, source: "invalid-file" as const };
  }
}

export function activeEverflowConfig() {
  return readEverflowConfig({ ...process.env, EVERFLOW_ENABLED: forwardingFlag().enabled ? "true" : "false" });
}

/** Owner-only API calls this. Enabling still requires a fully valid provider configuration. */
export function setForwardingFlag(enabled: boolean) {
  if (enabled) readEverflowConfig({ ...process.env, EVERFLOW_ENABLED: "true" });
  const file = flagPath();
  const dir = path.dirname(file);
  if (process.env.APP_ENV !== "production") mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (!existsSync(dir) || !lstatSync(dir).isDirectory()) throw new HostedCheckoutError("Le dossier de contrôle du paiement est indisponible.");
  const temp = path.join(dir, `.everflow-${randomBytes(12).toString("hex")}.tmp`);
  let fd: number | undefined;
  try {
    fd = openSync(temp, "wx", 0o600);
    writeSync(fd, `EVERFLOW_ENABLED=${enabled ? "true" : "false"}\n`);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temp, file);
  } catch {
    if (fd !== undefined) closeSync(fd);
    try { unlinkSync(temp); } catch { /* No temporary file left to remove. */ }
    throw new HostedCheckoutError("Impossible d’enregistrer le réglage serveur du paiement.");
  }
  return forwardingFlag();
}
