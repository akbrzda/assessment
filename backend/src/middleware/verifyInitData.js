const { validateInitData } = require('../services/telegramAuthService');
const { validateInitData: validateMaxInitData } = require("../services/maxAuthService");
const config = require('../config/env');

function buildTelegramBypassPayload() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const parsedId = Number(config.telegramBypassUser.id);
  const telegramId = Number.isFinite(parsedId) ? parsedId : 999000001;
  return {
    auth_date: String(nowSeconds),
    user: {
      id: telegramId,
      first_name: config.telegramBypassUser.firstName,
      last_name: config.telegramBypassUser.lastName,
      username: config.telegramBypassUser.username,
    },
    start_param: null,
    startapp: null,
  };
}

function buildMaxBypassPayload() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const parsedId = Number(config.maxBypassUser.id);
  const maxId = Number.isFinite(parsedId) ? parsedId : 999000002;
  return {
    auth_date: String(nowSeconds),
    user: {
      id: maxId,
      first_name: config.maxBypassUser.firstName,
      last_name: config.maxBypassUser.lastName,
      username: config.maxBypassUser.username,
    },
    start_param: null,
  };
}

function verifyInitData(req, res, next) {
  const requestedPlatform = String(req.headers["x-client-platform"] || "").toLowerCase();
  const telegramInitData = req.headers["x-telegram-init-data"] || req.body?.initData;
  const maxInitData = req.headers["x-max-init-data"] || req.body?.initData;

  const platform = requestedPlatform || (maxInitData ? "max" : "telegram");

  if (platform === "telegram" && config.telegramInitDataBypass) {
    req.telegramInitData = buildTelegramBypassPayload();
    req.platformInitData = req.telegramInitData;
    req.clientPlatform = "telegram";
    return next();
  }

  if (platform === "max" && config.maxInitDataBypass) {
    req.telegramInitData = buildMaxBypassPayload();
    req.platformInitData = req.telegramInitData;
    req.clientPlatform = "max";
    return next();
  }

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
