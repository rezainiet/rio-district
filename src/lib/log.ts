/**
 * Minimal structured logger. Production writes one JSON object per line to
 * stdout/stderr (collected by systemd-journald or PM2); development prints a
 * readable line. Never pass customer personal data (names, addresses, phone
 * numbers, e-mails of customers) in the context object.
 */
type Ctx = Record<string, unknown>;
type Level = "info" | "warn" | "error";

const production = process.env.NODE_ENV === "production";

function serialiseError(err: unknown) {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: production ? undefined : err.stack };
  return { message: String(err) };
}

function write(level: Level, event: string, ctx: Ctx = {}) {
  const payload = { ...ctx };
  if ("err" in payload) payload.err = serialiseError(payload.err);
  if (production) {
    const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...payload });
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
  } else {
    (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(`[${level}] ${event}`, payload);
  }
}

export const log = {
  info: (event: string, ctx?: Ctx) => write("info", event, ctx),
  warn: (event: string, ctx?: Ctx) => write("warn", event, ctx),
  error: (event: string, ctx?: Ctx) => write("error", event, ctx),
};
