import rateLimit from "express-rate-limit";

const json = (req, res) =>
  res.status(429).json({
    error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down and try again shortly." },
  });

// General API limiter.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json,
});

// Stricter limiter for auth + contact (anti brute-force / spam).
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json,
});
