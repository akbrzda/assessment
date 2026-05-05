const config = require("../config/env");

/**
 * Проверяет авторизацию внутренних запросов от Telegram-бота.
 * Бот передаёт BOT_TOKEN в заголовке Authorization: Bearer <token>.
 */
function verifyBotToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!config.botToken || token !== config.botToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

module.exports = verifyBotToken;
