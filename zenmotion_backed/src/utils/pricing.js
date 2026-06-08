import { config } from "../config/index.js";
import { getProduct, validateOptions } from "../data/products.js";
import { ApiError } from "./errors.js";

/**
 * Recompute a cart server-side from the raw client items.
 * The client only sends product ids, options and quantities — NEVER prices.
 *
 * @param {Array<{id:string, opts?:object, options?:object, qty?:number, quantity?:number}>} rawItems
 * @returns {{ items, subtotalCents, shippingCents, totalCents, hasPhysical, currency }}
 */
export function priceCart(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new ApiError(400, "Cart is empty.", "EMPTY_CART");
  }

  const items = [];
  let subtotalCents = 0;
  let hasPhysical = false;

  for (const raw of rawItems) {
    const product = getProduct(raw?.id);
    if (!product) {
      throw new ApiError(400, `Unknown product: ${raw?.id}`, "UNKNOWN_PRODUCT");
    }

    const qty = Math.floor(Number(raw.qty ?? raw.quantity ?? 1));
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
      throw new ApiError(400, `Invalid quantity for ${product.name}`, "INVALID_QTY");
    }

    const { ok, options, error } = validateOptions(product, raw.opts ?? raw.options ?? {});
    if (!ok) throw new ApiError(400, error, "INVALID_OPTION");

    const lineCents = product.price * qty;
    subtotalCents += lineCents;
    if (product.type === "physical") hasPhysical = true;

    items.push({
      productId: product.id,
      name: product.name,
      type: product.type,
      unitCents: product.price,
      qty,
      options,
      lineCents,
    });
  }

  const shippingCents = computeShipping(subtotalCents, hasPhysical);
  const totalCents = subtotalCents + shippingCents;

  return {
    items,
    subtotalCents,
    shippingCents,
    totalCents,
    hasPhysical,
    currency: config.store.currency,
  };
}

export function computeShipping(subtotalCents, hasPhysical) {
  if (!hasPhysical) return 0;
  const { shippingFlatCents, freeShippingThresholdCents } = config.store;
  if (freeShippingThresholdCents > 0 && subtotalCents >= freeShippingThresholdCents) {
    return 0;
  }
  return shippingFlatCents;
}

export function formatMoney(minor, currency = config.store.currency) {
  const value = minor / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}
