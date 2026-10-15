/**
 * Local development MongoDB.
 *
 * Starts a real `mongod` binary (downloaded once by mongodb-memory-server)
 * with on-disk persistence in `.data/mongo`, listening on 127.0.0.1:27017.
 * Use this only when you don't have MongoDB installed or an Atlas cluster.
 *
 *   npm run db:local
 *
 * Then set MONGODB_URI=mongodb://127.0.0.1:27017/kalt in .env.local.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  const dbPath = path.resolve(process.cwd(), ".data/mongo");
  mkdirSync(dbPath, { recursive: true });
  const port = Number(process.env.LOCAL_MONGO_PORT ?? 27017);

  const server = await MongoMemoryServer.create({
    instance: { port, ip: "127.0.0.1", dbPath, storageEngine: "wiredTiger" },
  });

  console.log(`[db:local] MongoDB prête sur ${server.getUri()} (données : ${dbPath})`);
  console.log("[db:local] Ctrl+C pour arrêter.");

  const stop = async () => {
    await server.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error("[db:local] échec du démarrage :", err);
  process.exit(1);
});
