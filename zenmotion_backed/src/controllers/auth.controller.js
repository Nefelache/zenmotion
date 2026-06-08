import bcrypt from "bcryptjs";
import { asyncHandler, ApiError } from "../utils/errors.js";
import { config } from "../config/index.js";
import {
  signAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  durationToMs,
} from "../utils/jwt.js";
import * as Users from "../models/user.model.js";
import * as RefreshTokens from "../models/refreshToken.model.js";
import * as Entitlements from "../models/entitlement.model.js";

const REFRESH_COOKIE = "refresh_token";

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? "none" : "lax",
    path: "/api/auth",
    maxAge: durationToMs(config.jwt.refreshTtl),
  };
}

async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti } = generateRefreshToken(user);
  RefreshTokens.store({
    jti,
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + durationToMs(config.jwt.refreshTtl)).toISOString(),
  });
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return { accessToken, refreshToken };
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (Users.findByEmail(email)) {
    throw ApiError.conflict("An account with that email already exists.", "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = Users.create({ email, name, passwordHash });

  // Attach any guest purchases made with this email.
  Entitlements.linkToUser(email, user.id);

  const { accessToken } = await issueSession(res, user);
  res.status(201).json({ user: Users.toPublic(user), accessToken });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = Users.findByEmail(email);

  // Constant-ish time: always run a compare to reduce user enumeration.
  const hash = user ? user.password_hash : "$2a$12$0000000000000000000000000000000000000000000000000000";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) {
    throw ApiError.unauthorized("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  Entitlements.linkToUser(email, user.id);
  const { accessToken } = await issueSession(res, user);
  res.json({ user: Users.toPublic(user), accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  if (!token) throw ApiError.unauthorized("Missing refresh token.", "NO_REFRESH_TOKEN");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid refresh token.", "REFRESH_INVALID");
  }

  const stored = RefreshTokens.findByHash(hashToken(token));
  if (!RefreshTokens.isActive(stored)) {
    throw ApiError.unauthorized("Refresh token expired or revoked.", "REFRESH_EXPIRED");
  }

  const user = Users.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("Account no longer exists.");

  // Rotate: revoke the old token, issue a new pair.
  RefreshTokens.revoke(stored.id);
  const { accessToken } = await issueSession(res, user);
  res.json({ user: Users.toPublic(user), accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    const stored = RefreshTokens.findByHash(hashToken(token));
    if (stored) RefreshTokens.revoke(stored.id);
  }
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const user = Users.findById(req.user.id);
  const entitlements = Entitlements.listByUser(req.user.id).map((e) => e.product_id);
  res.json({ user: Users.toPublic(user), entitlements });
});
