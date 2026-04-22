const logger = require("../utils/logger");

function errorHandler(err, req, res, next) {
  logger.error("Unhandled error: %s", err.stack || err.message);
  const status = err.status || 500;
  const message = status === 500 ? "Internal Server Error" : err.message;
  const payload = { error: message };
  if (err.code && status !== 500) {
    payload.code = err.code;
  }
  res.status(status).json(payload);
}

module.exports = errorHandler;
