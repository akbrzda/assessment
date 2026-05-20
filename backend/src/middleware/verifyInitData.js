const { validateInitData } = require('../services/telegramAuthService');
const { validateInitData: validateMaxInitData } = require("../services/maxAuthService");

function verifyInitData(req, res, next) {
  const requestedPlatform = String(req.headers["x-client-platform"] || "").toLowerCase();
  const telegramInitData = req.headers["x-telegram-init-data"] || req.body?.initData;
  const maxInitData = req.headers["x-max-init-data"] || req.body?.initData;

  const platform = requestedPlatform || (maxInitData ? "max" : "telegram");

  const payload = platform === "max" ? validateMaxInitData(maxInitData) : validateInitData(telegramInitData);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid initData' });
  }

  req.telegramInitData = payload;
  req.platformInitData = payload;
  req.clientPlatform = platform;
  next();
}

module.exports = verifyInitData;
