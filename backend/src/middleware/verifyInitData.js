const { validateInitData } = require("../services/telegramAuthService");
const { validateInitData: validateMaxInitData } = require("../services/maxAuthService");
const logger = require("../utils/logger");

function verifyInitData(req, res, next) {
  const requestedPlatform = String(req.headers["x-client-platform"] || "").toLowerCase();
  const telegramInitData = req.headers["x-telegram-init-data"] || req.body?.initData;
  const maxInitData = req.headers["x-max-init-data"] || req.body?.initData;

  const platform = requestedPlatform || (maxInitData ? "max" : "telegram");

  logger.info("[verifyInitData] запрос авторизации", {
    platform,
    requestedPlatform: requestedPlatform || null,
    hasMaxHeader: Boolean(req.headers["x-max-init-data"]),
    hasTelegramHeader: Boolean(req.headers["x-telegram-init-data"]),
    hasBodyInitData: Boolean(req.body?.initData),
    url: req.originalUrl,
    method: req.method,
  });

  const payload = platform === "max" ? validateMaxInitData(maxInitData) : validateInitData(telegramInitData);

  if (!payload) {
    logger.warn("[verifyInitData] невалидный initData — отказ 401", {
      platform,
      requestedPlatform: requestedPlatform || null,
      hasMaxHeader: Boolean(req.headers["x-max-init-data"]),
      hasTelegramHeader: Boolean(req.headers["x-telegram-init-data"]),
      hasBodyInitData: Boolean(req.body?.initData),
      url: req.originalUrl,
    });
    return res.status(401).json({ error: "Invalid initData" });
  }

  req.telegramInitData = payload;
  req.platformInitData = payload;
  req.clientPlatform = platform;
  next();
}

module.exports = verifyInitData;
