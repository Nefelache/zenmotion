/**
 * Operational error with an HTTP status and machine-readable code.
 * Anything thrown that is NOT an ApiError is treated as a 500.
 */
export class ApiError extends Error {
  constructor(status = 500, message = "Something went wrong.", code = "INTERNAL", details = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = status < 500;
  }

  static badRequest(message, code = "BAD_REQUEST", details) {
    return new ApiError(400, message, code, details);
  }
  static unauthorized(message = "Authentication required.", code = "UNAUTHORIZED") {
    return new ApiError(401, message, code);
  }
  static forbidden(message = "Not allowed.", code = "FORBIDDEN") {
    return new ApiError(403, message, code);
  }
  static notFound(message = "Not found.", code = "NOT_FOUND") {
    return new ApiError(404, message, code);
  }
  static conflict(message = "Conflict.", code = "CONFLICT") {
    return new ApiError(409, message, code);
  }
}

/** Wrap async route handlers so rejected promises hit the error middleware. */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
