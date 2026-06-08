import crypto from "node:crypto";
import { db } from "../db/index.js";

const insertStmt = db.prepare(
  `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
   VALUES (@id, @user_id, @token_hash, @expires_at)`
);
const byHashStmt = db.prepare(`SELECT * FROM refresh_tokens WHERE token_hash = ?`);
const revokeStmt = db.prepare(`UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE id = ?`);
const revokeAllStmt = db.prepare(
  `UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`
);

export function store({ jti, userId, tokenHash, expiresAt }) {
  insertStmt.run({
    id: jti || crypto.randomUUID(),
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
}

export function findByHash(tokenHash) {
  return byHashStmt.get(tokenHash);
}

export function isActive(row) {
  if (!row) return false;
  if (row.revoked_at) return false;
  return new Date(row.expires_at).getTime() > Date.now();
}

export function revoke(id) {
  revokeStmt.run(id);
}

export function revokeAllForUser(userId) {
  revokeAllStmt.run(userId);
}
