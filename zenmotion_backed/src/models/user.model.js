import crypto from "node:crypto";
import { db } from "../db/index.js";

const insertStmt = db.prepare(
  `INSERT INTO users (id, email, name, password_hash, role)
   VALUES (@id, @email, @name, @password_hash, @role)`
);
const byIdStmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
const byEmailStmt = db.prepare(`SELECT * FROM users WHERE email = ?`);

export function create({ email, name, passwordHash, role = "customer" }) {
  const id = crypto.randomUUID();
  insertStmt.run({ id, email: email.toLowerCase(), name: name || null, password_hash: passwordHash, role });
  return byIdStmt.get(id);
}

export function findById(id) {
  return byIdStmt.get(id);
}

export function findByEmail(email) {
  if (!email) return null;
  return byEmailStmt.get(email.toLowerCase());
}

/** Public shape — never leak the password hash. */
export function toPublic(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.created_at,
  };
}
