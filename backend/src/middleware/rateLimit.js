const rateLimit = require("express-rate-limit");
const { adminRateLimitConfig } = require("../config/rateLimitConfig");

const verifyCertificateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много запросов. Повторите позже." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много запросов к auth API. Повторите позже." },
});

const adminGlobalLimiter = rateLimit({
  windowMs: adminRateLimitConfig.windowMs,
  max: adminRateLimitConfig.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много запросов к админ API. Повторите позже." },
});

module.exports = {
  verifyCertificateLimiter,
  authLimiter,
  adminGlobalLimiter,
};
