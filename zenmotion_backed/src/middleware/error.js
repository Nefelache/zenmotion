import { ApiError } from "../utils/errors.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, "ROUTE_NOT_FOUND"));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const isApi = err instanceof ApiError;
  const status = isApi ? err.status : 500;

  if (status >= 500) {
    logger.error("Unhandled error:", err);
  } else {
    logger.warn(`${status} ${err.code || ""} ${err.message}`);
  }

  const body = {
    error: {
      code: isApi ? err.code : "INTERNAL",
      message: isApi && err.expose ? err.message : "Something went wrong. Please try again.",
    },
  };
  if (isApi && err.details) body.error.details = err.details;
  if (!config.isProd && status >= 500) body.error.stack = err.stack;

  res.status(status).json(body);
}
