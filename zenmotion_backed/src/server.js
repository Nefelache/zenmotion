import { createApp } from "./app.js";
import { config, assertProductionConfig } from "./config/index.js";
import { runMigrations } from "./db/migrate.js";
import { closeDb } from "./db/index.js";
import { logger } from "./utils/logger.js";

assertProductionConfig();
runMigrations();

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`ZenMotion API listening on http://localhost:${config.port} (${config.env})`);
  if (!config.airwallex.configured) {
    logger.warn("Airwallex is NOT configured — /api/checkout runs in DEMO mode.");
  }
  if (!config.mail.configured) {
    logger.warn("SMTP is NOT configured — emails are logged to the console.");
  }
});

function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully.`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  // Force-exit if it hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => logger.error("Unhandled rejection:", reason));
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  shutdown("uncaughtException");
});
