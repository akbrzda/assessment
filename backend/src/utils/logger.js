const { createLogger, format, transports } = require("winston");
const path = require("path");

// Поля, которые нельзя выводить в логах (ПДн и чувствительные данные)
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "access_token",
  "refresh_token",
  "jwt",
  "secret",
  "phone",
  "telegram_id",
  "telegramId",
  "initData",
  "hash",
  "authorization",
  "cookie",
]);

function maskSensitive(obj, depth = 0) {
  if (depth > 5 || obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitive(item, depth + 1));
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "***";
    } else {
      result[key] = maskSensitive(value, depth + 1);
    }
  }
  return result;
}

// Форматтер-трансформер, маскирующий чувствительные поля в meta-объектах лога
const piiMask = format((info) => {
  const masked = maskSensitive(info);
  // Обязательно сохраняем служебные поля winston без изменений
  masked[Symbol.for("level")] = info[Symbol.for("level")];
  masked[Symbol.for("splat")] = info[Symbol.for("splat")];
  return masked;
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    piiMask(),
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: path.resolve(process.cwd(), "logs", "app.log"),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
    }),
  ],
});

module.exports = logger;
