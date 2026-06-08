import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { config } from "../config/index.js";

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, typ: "access" },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * Refresh tokens are opaque random strings. We sign a JWT wrapper so we can
 * carry the user id, but we also persist a hash for revocation.
 */
export function generateRefreshToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: user.id, jti, typ: "refresh" },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshTtl }
  );
  return { token, jti };
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Parse a duration string like "30d", "15m", "12h" into milliseconds. */
export function durationToMs(str) {
  const m = /^(\d+)\s*([smhd])$/.exec(String(str).trim());
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = m[2];
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  return n * mult;
}
