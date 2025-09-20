const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error: %s', err.stack || err.message);
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
