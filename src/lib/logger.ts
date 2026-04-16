const isDev = process.env.NODE_ENV === "development";

type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, tag: string, message: string, data?: Record<string, unknown>): void {
  if (!isDev && level === "debug") return;

  const prefix = `[${tag}]`;
  const fn = level === "debug" ? console.debug
    : level === "info" ? console.info
    : level === "warn" ? console.warn
    : console.error;

  if (data) {
    fn(prefix, message, data);
  } else {
    fn(prefix, message);
  }
}

export const logger = {
  debug: (tag: string, message: string, data?: Record<string, unknown>) => log("debug", tag, message, data),
  info: (tag: string, message: string, data?: Record<string, unknown>) => log("info", tag, message, data),
  warn: (tag: string, message: string, data?: Record<string, unknown>) => log("warn", tag, message, data),
  error: (tag: string, message: string, data?: Record<string, unknown>) => log("error", tag, message, data),
};
