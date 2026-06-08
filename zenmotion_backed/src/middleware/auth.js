import { ApiError } from "../utils/errors.js";
import { verifyAccessToken } from "../utils/jwt.js";
import * as Users from "../models/user.model.js";

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  if (req.cookies?.access_token) return req.cookies.access_token;
  return null;
}

/** Require a valid access token. Populates req.user. */
export function requireAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    const payload = verifyAccessToken(token);
    const user = Users.findById(payload.sub);
    if (!user) return next(ApiError.unauthorized("Account no longer exists."));
    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token.", "TOKEN_INVALID"));
  }
}

/** Attach req.user if a valid token is present, but never block the request. */
export function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = Users.findById(payload.sub);
    if (user) req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
  } catch {
    /* ignore — treat as anonymous */
  }
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}
