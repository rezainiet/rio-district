/**
 * Safety rails for maintenance scripts.
 * A target is "production" when APP_ENV or NODE_ENV is set to production
 * (set APP_ENV=production in the server's environment file).
 */
export function isProductionTarget() {
  return process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
}

/** Exits before anything is written when a test/dev-only script targets production. */
export function refuseInProduction(what: string) {
  if (isProductionTarget()) {
    console.error(`✗ ${what} : désactivé en production (APP_ENV/NODE_ENV=production). Rien n'a été modifié.`);
    process.exit(1);
  }
}
