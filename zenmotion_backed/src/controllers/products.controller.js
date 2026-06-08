import { asyncHandler, ApiError } from "../utils/errors.js";
import { listProducts, getProduct } from "../data/products.js";
import { config } from "../config/index.js";

function publicProduct(p) {
  return {
    id: p.id,
    name: p.name,
    short: p.short,
    priceCents: p.price,
    currency: config.store.currency,
    type: p.type,
    url: p.url,
    blurb: p.blurb,
    options: p.options || {},
  };
}

export const list = asyncHandler(async (_req, res) => {
  res.json({
    currency: config.store.currency,
    products: listProducts().map(publicProduct),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const product = getProduct(req.params.id);
  if (!product) throw ApiError.notFound("Product not found.");
  res.json({ product: publicProduct(product) });
});
