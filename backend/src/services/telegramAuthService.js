const crypto = require('crypto');
const logger = require('../utils/logger');
const config = require('../config/env');

function validateInitData(initDataString) {
  if (!initDataString) {
    return null;
  }

  const params = new URLSearchParams(initDataString);
  const receivedHash = params.get('hash');
  if (!receivedHash) {
    return null;
  }

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([aKey], [bKey]) => aKey.localeCompare(bKey))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(config.botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const hashBuffer = Buffer.from(computedHash, 'hex');
  const receivedBuffer = Buffer.from(receivedHash, 'hex');

  if (hashBuffer.length !== receivedBuffer.length) {
    return null;
  }

  const isValid = crypto.timingSafeEqual(hashBuffer, receivedBuffer);
  if (!isValid) {
    logger.warn('Invalid initData hash.');
    return null;
  }

  const payload = {};
  for (const [key, value] of params.entries()) {
    payload[key] = value;
  }

  if (payload.user) {
    try {
      payload.user = JSON.parse(payload.user);
    } catch (error) {
      logger.warn('Failed to parse user from initData: %s', error.message);
    }
  }

  return payload;
}

module.exports = {
  validateInitData
};
