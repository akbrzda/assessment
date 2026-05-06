const rateLimit = require("express-rate-limit");

const verifyCertificateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много запросов. Повторите позже." },
});

module.exports = {
  verifyCertificateLimiter,
};
