import { db } from "../db/index.js";

const insertStmt = db.prepare(
  `INSERT OR IGNORE INTO webhook_events (id, provider, type, payload_json)
   VALUES (@id, @provider, @type, @payload_json)`
);
const existsStmt = db.prepare(`SELECT 1 FROM webhook_events WHERE id = ? LIMIT 1`);

/** Returns true if this event was newly recorded, false if already seen. */
export function recordIfNew({ id, provider, type, payload }) {
  if (!id) return true; // can't dedupe without an id; process anyway
  if (existsStmt.get(id)) return false;
  insertStmt.run({ id, provider, type: type || null, payload_json: payload ? JSON.stringify(payload) : null });
  return true;
}
