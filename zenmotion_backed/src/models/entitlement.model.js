import crypto from "node:crypto";
import { db } from "../db/index.js";

const upsertStmt = db.prepare(
  `INSERT INTO entitlements (id, user_id, email, product_id, order_id)
   VALUES (@id, @user_id, @email, @product_id, @order_id)
   ON CONFLICT(email, product_id) DO UPDATE SET
     user_id = COALESCE(excluded.user_id, entitlements.user_id),
     order_id = COALESCE(excluded.order_id, entitlements.order_id)`
);
const byEmailStmt = db.prepare(`SELECT * FROM entitlements WHERE email = ?`);
const byUserStmt = db.prepare(`SELECT * FROM entitlements WHERE user_id = ?`);
const hasStmt = db.prepare(`SELECT 1 FROM entitlements WHERE email = ? AND product_id = ? LIMIT 1`);
const linkUserStmt = db.prepare(
  `UPDATE entitlements SET user_id = ? WHERE email = ? AND user_id IS NULL`
);

export function grant({ email, productId, userId = null, orderId = null }) {
  upsertStmt.run({
    id: crypto.randomUUID(),
    user_id: userId,
    email: email.toLowerCase(),
    product_id: productId,
    order_id: orderId,
  });
}

export function listByEmail(email) {
  return byEmailStmt.all(email.toLowerCase());
}

export function listByUser(userId) {
  return byUserStmt.all(userId);
}

export function has(email, productId) {
  return Boolean(hasStmt.get(email.toLowerCase(), productId));
}

/** When a user registers/logs in, attach any entitlements bought as a guest. */
export function linkToUser(email, userId) {
  linkUserStmt.run(userId, email.toLowerCase());
}
