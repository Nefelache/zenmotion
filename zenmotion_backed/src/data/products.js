/* ==========================================================================
   SERVER-AUTHORITATIVE product catalog.
   Mirrors assets/app.js `PRODUCTS` on the frontend, but THIS is the source of
   truth. Prices are in MINOR units (cents). Never trust client-sent prices.
   ========================================================================== */

export const PRODUCTS = {
  course: {
    id: "course",
    name: "Tai Chi Beginner Video Course",
    short: "Course",
    price: 2900,
    type: "digital",
    url: "course.html",
    blurb:
      "A beginner-friendly video course. 15 minutes a day of gentle, low-impact movement.",
    options: {},
  },
  tshirt: {
    id: "tshirt",
    name: "ZenMotion Breathable Practice T-Shirt",
    short: "T-Shirt",
    price: 7900,
    type: "physical",
    url: "product-tshirt.html",
    blurb: "Soft, breathable shirt designed for easy movement during practice.",
    options: { Size: ["S", "M", "L", "XL", "2XL"] },
  },
  mat: {
    id: "mat",
    name: "ZenMotion Joint-Support Anti-slip Mat",
    short: "Mat",
    price: 9900,
    type: "physical",
    url: "product-mat.html",
    blurb:
      "Extra-cushioned, non-slip mat to support joints during floor and standing work.",
    options: {},
  },
};

export function getProduct(id) {
  return PRODUCTS[id] || null;
}

export function listProducts() {
  return Object.values(PRODUCTS);
}

/**
 * Validate a selected option set against the product's allowed options.
 * Returns { ok, options, error }.
 */
export function validateOptions(product, rawOptions = {}) {
  const allowed = product.options || {};
  const cleaned = {};
  const allowedKeys = Object.keys(allowed);

  // Required option groups must be present (e.g. t-shirt Size).
  for (const key of allowedKeys) {
    const value = rawOptions[key];
    if (value === undefined || value === null || value === "") {
      return { ok: false, error: `Missing option "${key}" for ${product.name}` };
    }
    if (!allowed[key].includes(value)) {
      return {
        ok: false,
        error: `Invalid ${key} "${value}" for ${product.name}`,
      };
    }
    cleaned[key] = value;
  }
  return { ok: true, options: cleaned };
}
