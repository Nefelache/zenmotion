import { Router } from "express";
import * as Contact from "../controllers/contact.controller.js";
import { validate } from "../middleware/validate.js";
import { strictLimiter } from "../middleware/rateLimit.js";
import { contactSchema } from "../validation/schemas.js";

const router = Router();

router.post("/", strictLimiter, validate(contactSchema), Contact.submit);

export default router;
