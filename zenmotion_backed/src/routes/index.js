import { Router } from "express";
import authRoutes from "./auth.routes.js";
import productRoutes from "./products.routes.js";
import checkoutRoutes from "./checkout.routes.js";
import contactRoutes from "./contact.routes.js";
import orderRoutes from "./orders.routes.js";
import entitlementRoutes from "./entitlements.routes.js";
import { config } from "../config/index.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    name: "ZenMotion API",
    version: "1.0.0",
    status: "ok",
    docs: "/api/health for status; see README.md for endpoints.",
    paymentsConfigured: config.airwallex.configured,
  });
});

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/contact", contactRoutes);
router.use("/orders", orderRoutes);
router.use("/entitlements", entitlementRoutes);

export default router;
