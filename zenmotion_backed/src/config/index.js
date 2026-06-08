import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// project root = two levels up from src/config
export const ROOT_DIR = path.resolve(__dirname, "..", "..");

function bool(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function list(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const env = process.env.NODE_ENV || "development";
const isProd = env === "production";

export const config = {
  env,
  isProd,
  port: int(process.env.PORT, 4000),
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:4000",
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || "http://localhost:5173",
  corsOrigins: [
    process.env.FRONTEND_BASE_URL || "http://localhost:5173",
    ...list(process.env.CORS_EXTRA_ORIGINS),
  ],

  db: {
    file: process.env.DATABASE_FILE || "data/zenmotion.db",
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
    accessTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL || "30d",
  },

  store: {
    currency: process.env.CURRENCY || "USD",
    shippingFlatCents: int(process.env.SHIPPING_FLAT_CENTS, 900),
    freeShippingThresholdCents: int(process.env.FREE_SHIPPING_THRESHOLD_CENTS, 0),
    statementDescriptor: process.env.STATEMENT_DESCRIPTOR || "ZENMOTION",
  },

  airwallex: {
    baseUrl: process.env.AIRWALLEX_BASE_URL || "https://api-demo.airwallex.com",
    clientId: process.env.AIRWALLEX_CLIENT_ID || "",
    apiKey: process.env.AIRWALLEX_API_KEY || "",
    webhookSecret: process.env.AIRWALLEX_WEBHOOK_SECRET || "",
    mode: (process.env.AIRWALLEX_MODE || "hosted").toLowerCase(), // "hosted" | "intent"
    get configured() {
      return Boolean(this.clientId && this.apiKey);
    },
  },

  mail: {
    host: process.env.SMTP_HOST || "",
    port: int(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "ZenMotion <support@zenmotionpeace.com>",
    supportEmail: process.env.SUPPORT_EMAIL || "support@zenmotionpeace.com",
    get configured() {
      return Boolean(this.host);
    },
  },
};

/**
 * Warn loudly in production if critical secrets are left at their dev defaults.
 */
export function assertProductionConfig() {
  if (!isProd) return;
  const problems = [];
  if (config.jwt.accessSecret.includes("change-me") || config.jwt.accessSecret.startsWith("dev-")) {
    problems.push("JWT_ACCESS_SECRET is not set to a secure value");
  }
  if (config.jwt.refreshSecret.includes("change-me") || config.jwt.refreshSecret.startsWith("dev-")) {
    problems.push("JWT_REFRESH_SECRET is not set to a secure value");
  }
  if (!config.airwallex.configured) {
    problems.push("Airwallex credentials are missing — checkout will fail");
  }
  if (problems.length) {
    // eslint-disable-next-line no-console
    console.warn("\n[config] PRODUCTION WARNING:\n  - " + problems.join("\n  - ") + "\n");
  }
}
