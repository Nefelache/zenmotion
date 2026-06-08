import { Router } from "express";
import * as OrdersCtrl from "../controllers/orders.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, OrdersCtrl.listMine);
router.get("/:id", requireAuth, OrdersCtrl.getOne);

export default router;
