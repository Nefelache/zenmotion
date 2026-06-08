/* Minimal structured-ish logger. Swap for pino/winston if needed. */
const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const current = levels[process.env.LOG_LEVEL] ?? levels.info;

function ts() {
  return new Date().toISOString();
}

function emit(level, args) {
  if (levels[level] > current) return;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(`[${ts()}] ${level.toUpperCase()}`, ...args);
}

export const logger = {
  error: (...a) => emit("error", a),
  warn: (...a) => emit("warn", a),
  info: (...a) => emit("info", a),
  debug: (...a) => emit("debug", a),
};
