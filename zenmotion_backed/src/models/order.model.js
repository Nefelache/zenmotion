import crypto from "node:crypto";
import { db } from "../db/index.js";

const insertOrder = db.prepare(
  `INSERT INTO orders
     (id, user_id, email, status, currency, subtotal_cents, shipping_cents, total_cents,
      has_physical, shipping_json, provider, provider_ref, provider_status, payment_method, metadata_json)
   VALUES
     (@id, @user_id, @email, @status, @currency, @subtotal_cents, @shipping_cents, @total_cents,
      @has_physical, @shipping_json, @provider, @provider_ref, @provider_status, @payment_method, @metadata_json)`
);
const insertItem = db.prepare(
  `INSERT INTO order_items
     (order_id, product_id, product_name, product_type, unit_cents, qty, options_json, line_cents)
   VALUES
     (@order_id, @product_id, @product_name, @product_type, @unit_cents, @qty, @options_json, @line_cents)`
);
const byIdStmt = db.prepare(`SELECT * FROM orders WHERE id = ?`);
const itemsByOrderStmt = db.prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id`);
const byProviderRefStmt = db.prepare(`SELECT * FROM orders WHERE provider_ref = ?`);
const byEmailStmt = db.prepare(`SELECT * FROM orders WHERE email = ? ORDER BY created_at DESC`);
const byUserStmt = db.prepare(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`);
const updateProviderStmt = db.prepare(
  `UPDATE orders SET provider = @provider, provider_ref = @provider_ref,
     provider_status = @provider_status, updated_at = datetime('now') WHERE id = @id`
);
const updateStatusStmt = db.prepare(
  `UPDATE orders SET status = @status, provider_status = @provider_status,
     paid_at = @paid_at, updated_at = datetime('now') WHERE id = @id`
);

export const createOrderWithItems = db.transaction((order, items) => {
  const id = order.id || crypto.randomUUID();
  insertOrder.run({
    id,
    user_id: order.userId || null,
    email: order.email.toLowerCase(),
    status: order.status || "pending",
    currency: order.currency,
    subtotal_cents: order.subtotalCents,
    shipping_cents: order.shippingCents,
    total_cents: order.totalCents,
    has_physical: order.hasPhysical ? 1 : 0,
    shipping_json: order.shipping ? JSON.stringify(order.shipping) : null,
    provider: order.provider || null,
    provider_ref: order.providerRef || null,
    provider_status: order.providerStatus || null,
    payment_method: order.paymentMethod || null,
    metadata_json: order.metadata ? JSON.stringify(order.metadata) : null,
  });
  for (const it of items) {
    insertItem.run({
      order_id: id,
      product_id: it.productId,
      product_name: it.name,
      product_type: it.type,
      unit_cents: it.unitCents,
      qty: it.qty,
      options_json: it.options ? JSON.stringify(it.options) : null,
      line_cents: it.lineCents,
    });
  }
  return id;
});

export function findById(id) {
  return byIdStmt.get(id);
}

export function findByProviderRef(ref) {
  return byProviderRefStmt.get(ref);
}

export function itemsFor(orderId) {
  return itemsByOrderStmt.all(orderId);
}

export function listByEmail(email) {
  return byEmailStmt.all(email.toLowerCase());
}

export function listByUser(userId) {
  return byUserStmt.all(userId);
}

export function setProvider({ id, provider, providerRef, providerStatus }) {
  updateProviderStmt.run({ id, provider, provider_ref: providerRef, provider_status: providerStatus });
}

export function setStatus({ id, status, providerStatus, paidAt }) {
  updateStatusStmt.run({
    id,
    status,
    provider_status: providerStatus || null,
    paid_at: paidAt || (status === "paid" ? new Date().toISOString() : null),
  });
}

export function toPublic(order, items) {
  return {
    id: order.id,
    email: order.email,
    status: order.status,
    currency: order.currency,
    subtotalCents: order.subtotal_cents,
    shippingCents: order.shipping_cents,
    totalCents: order.total_cents,
    hasPhysical: Boolean(order.has_physical),
    shipping: order.shipping_json ? JSON.parse(order.shipping_json) : null,
    paymentMethod: order.payment_method,
    provider: order.provider,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    items: (items || []).map((i) => ({
      productId: i.product_id,
      name: i.product_name,
      type: i.product_type,
      unitCents: i.unit_cents,
      qty: i.qty,
      options: i.options_json ? JSON.parse(i.options_json) : {},
      lineCents: i.line_cents,
    })),
  };
}
