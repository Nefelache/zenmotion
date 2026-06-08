import { asyncHandler, ApiError } from "../utils/errors.js";
import * as Orders from "../models/order.model.js";
import * as Entitlements from "../models/entitlement.model.js";

/** GET /api/orders/:id — view a single order (must own it). */
export const getOne = asyncHandler(async (req, res) => {
  const order = Orders.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found.");

  const owns =
    (order.user_id && order.user_id === req.user?.id) ||
    (req.user && order.email === req.user.email);
  if (!owns) throw ApiError.forbidden("You do not have access to this order.");

  res.json({ order: Orders.toPublic(order, Orders.itemsFor(order.id)) });
});

/** GET /api/orders — list the authenticated user's orders. */
export const listMine = asyncHandler(async (req, res) => {
  const byUser = Orders.listByUser(req.user.id);
  const byEmail = Orders.listByEmail(req.user.email);
  const map = new Map();
  for (const o of [...byUser, ...byEmail]) map.set(o.id, o);
  const orders = [...map.values()]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((o) => Orders.toPublic(o, Orders.itemsFor(o.id)));
  res.json({ orders });
});

/** GET /api/entitlements — what the authenticated user can access. */
export const myEntitlements = asyncHandler(async (req, res) => {
  const rows = Entitlements.listByUser(req.user.id);
  res.json({ entitlements: rows.map((e) => ({ productId: e.product_id, grantedAt: e.created_at })) });
});

/** GET /api/entitlements/check/:productId — does the user have access? */
export const checkAccess = asyncHandler(async (req, res) => {
  const access = Entitlements.has(req.user.email, req.params.productId);
  res.json({ productId: req.params.productId, access });
});
