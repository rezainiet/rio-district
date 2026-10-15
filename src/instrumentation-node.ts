/**
 * Node.js part of the startup hook (loaded by src/instrumentation.ts).
 * In production it refuses to boot with a configuration that would lose data
 * or break admin login, and warns about settings that need attention.
 */
export async function checkProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;

  const { mkdir, access, constants } = await import("node:fs/promises");
  const { log } = await import("./lib/log");
  const { UPLOAD_DIR } = await import("./lib/uploads");

  const problems: string[] = [];
  const uri = process.env.MONGODB_URI ?? "";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (!uri) problems.push("MONGODB_URI est manquant.");
  if (!site.startsWith("https://")) {
    problems.push("NEXT_PUBLIC_SITE_URL doit être en https:// AU MOMENT DU BUILD (valeur figée par next build ; cookies admin Secure, liens absolus, SEO).");
  }
  if (!process.env.UPLOAD_DIR) {
    problems.push("UPLOAD_DIR doit pointer vers un dossier persistant hors du dossier de release.");
  } else {
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
      await access(UPLOAD_DIR, constants.W_OK);
    } catch {
      problems.push(`UPLOAD_DIR (${UPLOAD_DIR}) n'est pas accessible en écriture.`);
    }
  }

  if (problems.length) {
    for (const p of problems) log.error("startup.config_invalid", { problem: p });
    // Exit non-zero so systemd/PM2 reports the failure instead of keeping a server that cannot serve.
    process.exit(1);
  }

  if (uri.startsWith("mongodb://") && !uri.includes("@")) {
    log.warn("startup.mongo_without_credentials", { hint: "Activer l'authentification MongoDB en production." });
  }
  if (process.env.PAYMENT_PROVIDER) {
    log.warn("startup.payment_provider_set", { provider: process.env.PAYMENT_PROVIDER, note: "Aucun adaptateur implémenté." });
  }
  log.info("startup.ok", { site, uploads: UPLOAD_DIR, appEnv: process.env.APP_ENV ?? null });
}
