import { asyncHandler, ApiError } from "../utils/errors.js";
import { config } from "../config/index.js";
import { priceCart } from "../utils/pricing.js";
import * as Orders from "../models/order.model.js";
import { createPayment } from "../services/airwallex.js";
import { markOrderPaid } from "../services/fulfillment.js";

/**
 * POST /api/checkout/quote
 * Server-side re-pricing of a cart. Lets the frontend show authoritative
 * totals (subtotal, shipping, total) without trusting client prices.
 */
export const quote = asyncHandler(async (req, res) => {
  const priced = priceCart(req.body.items);
  res.json({
    currency: priced.currency,
    subtotalCents: priced.subtotalCents,
    shippingCents: priced.shippingCents,
    totalCents: priced.totalCents,
    hasPhysical: priced.hasPhysical,
    items: priced.items,
  });
});

/**
 * POST /api/checkout
 * Recompute the cart, create a pending order, create the Airwallex payment,
 * and return a hosted `url` (redirect) or a `clientSecret` (drop-in element).
 */
export const createCheckout = asyncHandler(async (req, res) => {
  const { email, items, method, shipping } = req.body;

  const priced = priceCart(items);

  if (priced.hasPhysical) {
    const required = ["fullname", "addr1", "city", "zip", "country"];
    const missing = required.filter((k) => !shipping?.[k]);
    if (missing.length) {
      throw ApiError.badRequest(
        `Shipping address is required for physical items. Missing: ${missing.join(", ")}`,
        "SHIPPING_REQUIRED"
      );
    }
  }

  const userId = req.user?.id || null;

  // 1) Persist a pending order (authoritative snapshot).
  const orderId = Orders.createOrderWithItems(
    {
      userId,
      email,
      status: "pending",
      currency: priced.currency,
      subtotalCents: priced.subtotalCents,
      shippingCents: priced.shippingCents,
      totalCents: priced.totalCents,
      hasPhysical: priced.hasPhysical,
      shipping: priced.hasPhysical ? shipping : null,
      paymentMethod: method,
      provider: "airwallex",
    },
    priced.items
  );

  const returnUrl = `${config.frontendBaseUrl}/account.html?order=${orderId}&status=success`;
  const cancelUrl = `${config.frontendBaseUrl}/checkout.html?order=${orderId}&status=cancelled`;

  // 2) Create the payment with the provider.
  const order = Orders.findById(orderId);
  const payment = await createPayment({
    order: Orders.toPublic(order, priced.items),
    items: priced.items,
    returnUrl,
    cancelUrl,
  });

  // 3) Record provider reference on the order.
  Orders.setProvider({
    id: orderId,
    provider: payment.provider,
    providerRef: payment.providerRef,
    providerStatus: payment.providerStatus,
  });

  res.status(201).json({
    orderId,
    totalCents: priced.totalCents,
    currency: priced.currency,
    mode: payment.mode,
    url: payment.url || null,
    clientSecret: payment.clientSecret || null,
    intentId: payment.intentId || null,
    demo: payment.demo || false,
  });
});

/**
 * GET /api/checkout/demo-complete?order_id=...
 * DEMO-ONLY landing used when Airwallex credentials are not configured.
 * Marks the order paid so the full fulfillment flow can be exercised locally.
 * This route is disabled in production.
 */
export const demoComplete = asyncHandler(async (req, res) => {
  if (config.isProd) throw ApiError.notFound();
  const orderId = req.query.order_id;
  const order = Orders.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found.");

  await markOrderPaid(orderId, { providerStatus: "DEMO_SUCCEEDED" });

  res
    .status(200)
    .type("html")
    .send(
      `<!doctype html><html><head><meta charset="utf-8"><title>Demo payment complete</title>
       <style>body{font-family:system-ui;max-width:560px;margin:60px auto;padding:0 20px;color:#2a2a2a}
       .ok{color:#2e7d32}a{color:#6c5318}</style></head>
       <body><h1 class="ok">✅ Demo payment complete</h1>
       <p>Order <b>${orderId}</b> has been marked <b>paid</b> (DEMO mode — no real charge).</p>
       <p>Digital entitlements were granted and a confirmation email was sent
       (logged to the server console if SMTP is not configured).</p>
       <p>Configure <code>AIRWALLEX_CLIENT_ID</code> / <code>AIRWALLEX_API_KEY</code> to take real payments.</p>
       <p><a href="${config.frontendBaseUrl}/account.html">Go to your account →</a></p>
       </body></html>`
    );
});
