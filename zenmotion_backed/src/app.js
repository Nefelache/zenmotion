import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { notFoundHandler, errorHandler } from "./middleware/error.js";
import apiRouter from "./routes/index.js";
import webhookRouter from "./routes/webhook.routes.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet());

  // CORS — allow the configured frontend origin(s); allow credentials for cookies.
  const allowed = new Set(config.corsOrigins);
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / curl / server-to-server (no Origin header).
        if (!origin) return cb(null, true);
        if (allowed.has(origin)) return cb(null, true);
        return cb(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    })
  );

  if (config.env !== "test") {
    app.use(morgan(config.isProd ? "combined" : "dev", { stream: { write: (m) => logger.info(m.trim()) } }));
  }

  // Webhooks must be mounted BEFORE the JSON body parser (they need the raw body).
  app.use("/api/webhooks", webhookRouter);

  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Health checks (no rate limit).
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", env: config.env, time: new Date().toISOString() });
  });

  app.use("/api", apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
