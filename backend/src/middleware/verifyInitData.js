const { validateInitData } = require('../services/telegramAuthService');

function verifyInitData(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.body?.initData;
  const payload = validateInitData(initData);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid initData' });
  }

  req.telegramInitData = payload;
  next();
}

module.exports = verifyInitData;
