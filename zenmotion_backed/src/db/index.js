import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, ROOT_DIR } from "../config/index.js";
import { logger } from "../utils/logger.js";

const dbPath = path.isAbsolute(config.db.file)
  ? config.db.file
  : path.join(ROOT_DIR, config.db.file);

// Ensure the containing directory exists.
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

logger.info(`SQLite connected: ${dbPath}`);

// Apply the schema immediately on connect. This guarantees that all tables
// exist before any model module prepares its statements (ESM hoists imports,
// so model files load — and prepare — before server.js runs migrations).
const schema = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql"), "utf8");
db.exec(schema);

export function closeDb() {
  try {
    db.close();
  } catch {
    /* ignore */
  }
}
