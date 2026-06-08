import { asyncHandler } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { verifyWebhookSignature } from "../services/airwallex.js";
import { markOrderPaid, markOrderFailed } from "../services/fulfillment.js";
import * as Orders from "../models/order.model.js";
import * as WebhookEvents from "../models/webhookEvent.model.js";

const PAID_EVENTS = new Set([
  "payment_intent.succeeded",
  "payment_link.paid",
  "payment_attempt.captured",
  "payment_attempt.authorized",
]);
const FAILED_EVENTS = new Set([
  "payment_intent.cancelled",
  "payment_attempt.failed",
  "payment_intent.payment_failed",
]);

/**
 * POST /api/webhooks/airwallex
 * NOTE: this route is mounted with a RAW body parser so we can verify the
 * signature against the exact bytes Airwallex sent.
 */
export const airwallexWebhook = asyncHandler(async (req, res) => {
  const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body);
  const signature = req.get("x-signature");
  const timestamp = req.get("x-timestamp");

  if (!verifyWebhookSignature({ rawBody, signature, timestamp })) {
    logger.warn("Airwallex webhook signature verification failed.");
    return res.status(401).json({ error: { code: "BAD_SIGNATURE", message: "Invalid signature." } });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: { code: "BAD_PAYLOAD", message: "Invalid JSON." } });
  }

  // Idempotency — ignore events we've already processed.
  const isNew = WebhookEvents.recordIfNew({
    id: event.id,
    provider: "airwallex",
    type: event.name || event.type,
    payload: event,
  });
  if (!isNew) {
    logger.info(`Webhook ${event.id} already processed — ack.`);
    return res.json({ received: true, duplicate: true });
  }

  const type = event.name || event.type || "";
  const data = event.data?.object || event.data || {};
  const merchantOrderId = data.merchant_order_id || data.metadata?.order_id;
  const providerRef = data.id;

  // Resolve the order either by our merchant_order_id or by provider ref.
  let order = merchantOrderId ? Orders.findById(merchantOrderId) : null;
  if (!order && providerRef) order = Orders.findByProviderRef(providerRef);

  if (!order) {
    logger.warn(`Webhook ${type}: no matching order (merchant_order_id=${merchantOrderId}).`);
    return res.json({ received: true, matched: false });
  }

  if (PAID_EVENTS.has(type)) {
    await markOrderPaid(order.id, { providerStatus: data.status || type });
  } else if (FAILED_EVENTS.has(type)) {
    markOrderFailed(order.id, { providerStatus: data.status || type });
  } else {
    logger.info(`Webhook ${type}: no fulfillment action.`);
  }

  res.json({ received: true });
});
