import { ApiError } from "../utils/errors.js";

/**
 * Validate a request part ("body" | "query" | "params") against a Zod schema.
 * On success the parsed/clean value replaces req[part].
 */
export function validate(schema, part = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      return next(new ApiError(400, "Validation failed.", "VALIDATION_ERROR", details));
    }
    req[part] = result.data;
    next();
  };
}
