import { Router } from "express";
import * as Auth from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { strictLimiter } from "../middleware/rateLimit.js";
import { registerSchema, loginSchema } from "../validation/schemas.js";

const router = Router();

router.post("/register", strictLimiter, validate(registerSchema), Auth.register);
router.post("/login", strictLimiter, validate(loginSchema), Auth.login);
router.post("/refresh", Auth.refresh);
router.post("/logout", Auth.logout);
router.get("/me", requireAuth, Auth.me);

export default router;
