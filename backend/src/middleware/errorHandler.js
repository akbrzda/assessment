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

function normalizeValidationErrors(rawValidationErrors) {
  if (!Array.isArray(rawValidationErrors)) {
    return null;
  }

  return rawValidationErrors.map((item) => ({
    field: typeof item?.field === "string" ? item.field : "",
    message: typeof item?.message === "string" ? item.message : String(item?.message || ""),
  }));
}

function buildErrorPayload({ status, message, code, validationErrors }) {
  const payload = { error: message };
  if (code && status !== 500) {
    payload.code = code;
  }

  const normalizedValidationErrors = normalizeValidationErrors(validationErrors);
  if (normalizedValidationErrors && normalizedValidationErrors.length > 0 && status !== 500) {
    payload.validationErrors = normalizedValidationErrors;
  }

  return payload;
}

function errorResponseNormalizer(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const status = Number(res.statusCode || 200);
    if (status < 400 || !body || typeof body !== "object" || typeof body.error !== "string") {
      return originalJson(body);
    }

    return originalJson(
      buildErrorPayload({
        status,
        message: body.error,
        code: body.code,
        validationErrors: body.validationErrors,
      }),
    );
  };

  next();
}

function errorHandler(err, req, res, next) {
  const correlationId = req.correlationId || "-";
  logger.error("Unhandled error: %s", err.stack || err.message, { correlationId, method: req.method, url: req.originalUrl });
  const derivedStatus = isTransientDbError(err) ? 503 : 500;
  const status = err.status || derivedStatus;
  const message = status === 500 ? "Internal Server Error" : status === 503 ? "Service Unavailable" : err.message;
  const validationErrors =
    err.meta?.validationErrors ||
    err.validationErrors ||
    (Array.isArray(err.details)
      ? err.details.map((detail) => ({
          field: Array.isArray(detail.path) ? detail.path.join(".") : "",
          message: detail.message,
        }))
      : null);

  const payload = buildErrorPayload({
    status,
    message,
    code: err.code,
    validationErrors,
  });

  res.status(status).json(payload);
}

module.exports = {
  errorHandler,
  errorResponseNormalizer,
};
