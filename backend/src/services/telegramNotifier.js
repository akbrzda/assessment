const config = require('../config/env');
const logger = require('../utils/logger');

async function sendUserNotification(chatId, message) {
  if (!config.botToken) {
    logger.warn('Bot token is missing, skip user notification');
    return;
  }
  if (!chatId) {
    return;
  }
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    if (!response.ok) {
      const body = await response.text();
      logger.error('Failed to notify user %s: %s', chatId, body);
    }
  } catch (error) {
    logger.error('User notification error: %s', error.message);
  }
}

module.exports = {
  sendUserNotification
};
