const { validateInitData } = require('../services/telegramAuthService');
const config = require('../config/env');

function buildBypassPayload() {
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

function verifyInitData(req, res, next) {
  if (config.telegramInitDataBypass) {
    req.telegramInitData = buildBypassPayload();
    return next();
  }

  const initData = req.headers['x-telegram-init-data'] || req.body?.initData;
  const payload = validateInitData(initData);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid initData' });
  }

  req.telegramInitData = payload;
  next();
}

module.exports = verifyInitData;
