const logger = require('../utils/logger');
const config = require('../config/env');

async function sendTelegramLog(message) {
  if (!config.logBotToken || !config.logChatId) {
    logger.warn('Telegram log skipped: missing LOG_BOT_TOKEN or LOG_CHAT_ID');
    return;
  }

  const url = `https://api.telegram.org/bot${config.logBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.logChatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error('Telegram log failed: %s', body);
    }
  } catch (error) {
    logger.error('Telegram log error: %s', error.message);
  }
}

module.exports = {
  sendTelegramLog
};
