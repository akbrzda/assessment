const { randomUUID } = require("crypto");

// Middleware добавляет X-Request-Id в каждый запрос.
// Если клиент прислал свой id — используем его, иначе генерируем новый.
function correlationId(req, res, next) {
  const incoming = req.headers["x-request-id"] || req.headers["x-correlation-id"];
  const id = incoming && typeof incoming === "string" && incoming.length <= 128 ? incoming : randomUUID();
  req.correlationId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

module.exports = correlationId;
