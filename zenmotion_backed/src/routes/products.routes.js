import { Router } from "express";
import * as Products from "../controllers/products.controller.js";

const router = Router();

router.get("/", Products.list);
router.get("/:id", Products.getOne);

export default router;
