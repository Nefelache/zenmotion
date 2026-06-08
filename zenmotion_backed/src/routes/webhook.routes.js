import { Router } from "express";
import express from "express";
import * as Webhook from "../controllers/webhook.controller.js";

const router = Router();

// RAW body is required so the signature can be verified against exact bytes.
router.post(
  "/airwallex",
  express.raw({ type: "*/*", limit: "1mb" }),
  Webhook.airwallexWebhook
);

export default router;
