/** Explicit local simulator. Keeps the normal store database and .env.local untouched. */
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import mongoose from "mongoose";
import { mockEnvironment, seedTestDatabase } from "./lib/everflow-fixture";

async function main() {
  const uri = "mongodb://127.0.0.1:27017/rio_everflow_test_preview";
  const fixture = await seedTestDatabase(uri);
  await mkdir(".data", { recursive: true });
  await writeFile(".data/everflow-preview.json", JSON.stringify(fixture), { mode: 0o600 });
  await mongoose.disconnect();
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3001"], { stdio: "inherit", windowsHide: true,
    env: { ...process.env, ...mockEnvironment(uri), NEXT_PUBLIC_SITE_URL: "http://localhost:3001" } });
  child.on("exit", code => process.exit(code ?? 1));
  process.on("SIGINT", () => child.kill());
}
main().catch(() => { console.error("Local simulator could not start. Check local MongoDB and the isolated fixture configuration."); process.exit(1); });
