import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import * as Orders from "../models/order.model.js";
import * as Entitlements from "../models/entitlement.model.js";
import * as Users from "../models/user.model.js";
import { sendOrderConfirmation } from "./mailer.js";

/**
 * Mark an order paid (idempotently), grant digital entitlements, email receipt.
 * Safe to call multiple times for the same order.
 */
export async function markOrderPaid(orderId, { providerStatus } = {}) {
  const order = Orders.findById(orderId);
  if (!order) {
    logger.warn(`Fulfillment: order not found: ${orderId}`);
    return null;
  }
  if (order.status === "paid") {
    logger.info(`Fulfillment: order ${orderId} already paid — skipping.`);
    return order;
  }

  Orders.setStatus({ id: orderId, status: "paid", providerStatus, paidAt: new Date().toISOString() });

  const items = Orders.itemsFor(orderId);

  // Grant entitlements for digital products (course access).
  const user = order.user_id ? Users.findById(order.user_id) : Users.findByEmail(order.email);
  for (const item of items) {
    if (item.product_type === "digital") {
      Entitlements.grant({
        email: order.email,
        productId: item.product_id,
        userId: user ? user.id : null,
        orderId,
      });
    }
  }

  // Build a course access link (frontend account page).
  const accessLink = `${config.frontendBaseUrl}/account.html`;

  const publicOrder = Orders.toPublic(Orders.findById(orderId), items);
  await sendOrderConfirmation(publicOrder, publicOrder.items, accessLink);

  logger.info(`Fulfillment: order ${orderId} marked paid and fulfilled.`);
  return Orders.findById(orderId);
}

export function markOrderFailed(orderId, { providerStatus } = {}) {
  const order = Orders.findById(orderId);
  if (!order || order.status === "paid") return order || null;
  Orders.setStatus({ id: orderId, status: "failed", providerStatus });
  return Orders.findById(orderId);
}
