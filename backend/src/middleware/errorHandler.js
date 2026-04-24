const logger = require("../utils/logger");

const TRANSIENT_DB_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "PROTOCOL_SEQUENCE_TIMEOUT",
  "PROTOCOL_CONNECTION_LOST",
  "ECONNRESET",
  "ECONNREFUSED",
  "EADDRNOTAVAIL",
]);

function isTransientDbError(err) {
  return Boolean(err && TRANSIENT_DB_ERROR_CODES.has(err.code));
}

function errorHandler(err, req, res, next) {
  logger.error("Unhandled error: %s", err.stack || err.message);
  const derivedStatus = isTransientDbError(err) ? 503 : 500;
  const status = err.status || derivedStatus;
  const message = status === 500
    ? "Internal Server Error"
    : (status === 503 ? "Service Unavailable" : err.message);
  const payload = { error: message };
  if (err.code && status !== 500) {
    payload.code = err.code;
  }
  if (err.meta?.validationErrors && Array.isArray(err.meta.validationErrors) && status !== 500) {
    payload.validationErrors = err.meta.validationErrors;
  }
  res.status(status).json(payload);
}

module.exports = errorHandler;
