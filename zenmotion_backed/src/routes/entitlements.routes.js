import { Router } from "express";
import * as OrdersCtrl from "../controllers/orders.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, OrdersCtrl.myEntitlements);
router.get("/check/:productId", requireAuth, OrdersCtrl.checkAccess);

export default router;
