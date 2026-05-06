const repository = require("./repository");

async function listAuditLogs(filters) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));

  return repository.findAll({
    actorUserId: filters.actorUserId ? Number(filters.actorUserId) : null,
    action: filters.action ? String(filters.action).trim() : null,
    entityType: filters.entityType ? String(filters.entityType).trim() : null,
    status: ["success", "failure"].includes(filters.status) ? filters.status : null,
    from: filters.from || null,
    to: filters.to || null,
    page,
    limit,
  });
}

async function getAuditLogById(id) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    const err = new Error("Некорректный ID");
    err.status = 400;
    throw err;
  }

  const record = await repository.findById(numId);
  if (!record) {
    const err = new Error("Запись не найдена");
    err.status = 404;
    throw err;
  }

  return record;
}

module.exports = {
  listAuditLogs,
  getAuditLogById,
};
