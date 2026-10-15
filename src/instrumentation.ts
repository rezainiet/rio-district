/** Startup hook: production configuration checks run in the Node.js runtime only. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkProductionConfig } = await import("./instrumentation-node");
    await checkProductionConfig();
  }
}
