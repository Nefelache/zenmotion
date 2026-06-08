import crypto from "node:crypto";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { ApiError } from "../utils/errors.js";

/* ==========================================================================
   Airwallex integration.

   Docs: https://www.airwallex.com/docs/api
   - Auth:    POST {base}/api/v1/authentication/login  (x-client-id, x-api-key)
   - Intent:  POST {base}/api/v1/pa/payment_intents/create
   - Link:    POST {base}/api/v1/pa/payment_links/create  (hosted page)

   The frontend never touches card data. We create the payment server-side
   using SERVER prices, and return either a hosted `url` or a `clientSecret`.

   If credentials are not configured, we fall back to a clearly-marked DEMO
   response so the end-to-end flow is testable locally without real keys.
   ========================================================================== */

let cachedToken = null;
let cachedTokenExpiry = 0;

async function authenticate() {
  if (cachedToken && Date.now() < cachedTokenExpiry - 30_000) return cachedToken;

  const res = await fetch(`${config.airwallex.baseUrl}/api/v1/authentication/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.airwallex.clientId,
      "x-api-key": config.airwallex.apiKey,
    },
  });

  if (!res.ok) {
    const body = await safeJson(res);
    logger.error("Airwallex auth failed:", res.status, body);
    throw new ApiError(502, "Payment provider authentication failed.", "PROVIDER_AUTH_FAILED");
  }

  const data = await res.json();
  cachedToken = data.token;
  // Airwallex tokens last ~30 minutes; cache conservatively for 25.
  cachedTokenExpiry = Date.now() + 25 * 60 * 1000;
  return cachedToken;
}

async function apiPost(pathname, body) {
  const token = await authenticate();
  const res = await fetch(`${config.airwallex.baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await safeJson(res);
  if (!res.ok) {
    logger.error(`Airwallex ${pathname} failed:`, res.status, data);
    throw new ApiError(502, "Payment provider request failed.", "PROVIDER_ERROR", data);
  }
  return data;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Create a payment for an order.
 * @returns {Promise<{ provider, mode, providerRef, providerStatus, url?, clientSecret?, intentId?, demo?: boolean }>}
 */
export async function createPayment({ order, items, returnUrl, cancelUrl }) {
  const amount = +(order.totalCents / 100).toFixed(2); // Airwallex uses major units
  const requestId = crypto.randomUUID();

  // ---- DEMO fallback when no credentials are configured ----
  if (!config.airwallex.configured) {
    logger.warn("Airwallex not configured — returning DEMO payment response.");
    const fakeRef = "demo_" + crypto.randomUUID();
    return {
      provider: "airwallex",
      mode: "demo",
      providerRef: fakeRef,
      providerStatus: "REQUIRES_PAYMENT_METHOD",
      // Point at our own demo-complete page so the flow can be exercised locally.
      url: `${config.apiBaseUrl}/api/checkout/demo-complete?order_id=${order.id}`,
      demo: true,
    };
  }

  const common = {
    request_id: requestId,
    amount,
    currency: order.currency,
    merchant_order_id: order.id,
    descriptor: config.store.statementDescriptor,
    metadata: { order_id: order.id, email: order.email },
    order: {
      products: items.map((i) => ({
        name: i.name,
        quantity: i.qty,
        unit_price: +(i.unitCents / 100).toFixed(2),
        type: i.type,
        sku: i.productId,
      })),
    },
  };

  if (config.airwallex.mode === "intent") {
    const intent = await apiPost("/api/v1/pa/payment_intents/create", common);
    return {
      provider: "airwallex",
      mode: "intent",
      providerRef: intent.id,
      providerStatus: intent.status,
      intentId: intent.id,
      clientSecret: intent.client_secret,
    };
  }

  // Hosted Payment Page via Payment Link.
  const link = await apiPost("/api/v1/pa/payment_links/create", {
    ...common,
    title: "ZenMotion order",
    reusable: false,
    return_url: returnUrl,
    cancel_url: cancelUrl,
  });
  return {
    provider: "airwallex",
    mode: "hosted",
    providerRef: link.id,
    providerStatus: link.status,
    url: link.url,
  };
}

export async function retrievePaymentIntent(intentId) {
  if (!config.airwallex.configured) return null;
  const token = await authenticate();
  const res = await fetch(`${config.airwallex.baseUrl}/api/v1/pa/payment_intents/${intentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return safeJson(res);
}

/**
 * Verify the webhook signature.
 * Airwallex signs with HMAC-SHA256 over (timestamp + raw_request_body)
 * using your webhook secret. Header: `x-signature`, `x-timestamp`.
 */
export function verifyWebhookSignature({ rawBody, signature, timestamp }) {
  if (!config.airwallex.webhookSecret) {
    // No secret configured: in non-prod we allow it (for local testing).
    return !config.isProd;
  }
  if (!signature || !timestamp) return false;
  const payload = String(timestamp) + rawBody;
  const expected = crypto
    .createHmac("sha256", config.airwallex.webhookSecret)
    .update(payload, "utf8")
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
