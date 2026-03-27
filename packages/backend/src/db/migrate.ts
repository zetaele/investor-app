import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

migrate(db, { migrationsFolder: resolve(__dirname, "migrations") });
console.log("✅ Migrations applied");
