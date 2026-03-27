import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

mkdirSync(dirname(env.DATABASE_URL), { recursive: true });
const client = new Database(env.DATABASE_URL);

/** Enable WAL mode for better concurrent read performance. */
client.pragma("journal_mode = WAL");

/**
 * Drizzle database instance.
 * Import this wherever database access is needed — do not create new instances.
 */
export const db = drizzle(client, { schema });
