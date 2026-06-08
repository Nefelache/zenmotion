import { Router } from "express";
import * as Checkout from "../controllers/checkout.controller.js";
import { validate } from "../middleware/validate.js";
import { optionalAuth } from "../middleware/auth.js";
import { checkoutSchema } from "../validation/schemas.js";
import { z } from "zod";

const router = Router();

const quoteSchema = z.object({
  items: z.array(z.object({
    id: z.string().trim().min(1),
    opts: z.record(z.string(), z.string()).optional(),
    options: z.record(z.string(), z.string()).optional(),
    qty: z.coerce.number().int().min(1).max(99).optional(),
    quantity: z.coerce.number().int().min(1).max(99).optional(),
  })).min(1),
});

router.post("/quote", validate(quoteSchema), Checkout.quote);
router.post("/", optionalAuth, validate(checkoutSchema), Checkout.createCheckout);
router.get("/demo-complete", Checkout.demoComplete);

export default router;
