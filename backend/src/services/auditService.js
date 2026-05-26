function normalizeActor(actor = {}) {
  if (!actor) {
    return { id: null, role: null, name: null };
  }

  return {
    id: actor.id ?? null,
    role: actor.role ?? null,
    name: actor.name ?? null,
  };
}

function buildActorFromRequest(req, overrides = {}) {
  const user = req?.user || req?.currentUser || {};
  return normalizeActor({
    id: overrides.id ?? user.id ?? null,
    role: overrides.role ?? user.role ?? user.roleName ?? null,
    name:
      (overrides.name ?? user.fullName) ||
      user.username ||
      user.login ||
      (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null),
  });
}

function buildAuditEntry({
  timestamp = new Date().toISOString(),
  scope = "system",
  action,
  entity = null,
  entityId = null,
  actor,
  metadata = {},
  before = null,
  after = null,
  result = "success",
  initiatorIp = null,
  userAgent = null,
}) {
  if (!action) {
    throw new Error("Audit entry requires action");
  }

  const normalizedActor = normalizeActor(actor);

  return {
    timestamp,
    scope,
    action,
    entity,
    entityId,
    actor: normalizedActor,
    metadata,
    before,
    after,
    result,
    initiatorIp,
    userAgent,
  };
}

async function logAuditEvent(entry) {
  try {
    await auditRepository.createLog(entry);
  } catch (error) {
    // Не блокируем бизнес-операции при проблемах аудита.
    logger.warn("Не удалось сохранить аудит-событие:", { error: error.message });
  }
  return entry;
}

async function logAndSend({
  req,
  actor,
  scope = "admin_panel",
  action,
  entity,
  entityId,
  metadata = {},
  before = null,
  after = null,
  result = "success",
}) {
  const entry = buildAuditEntry({
    scope,
    action,
    entity,
    entityId,
    actor,
    metadata,
    before,
    after,
    result,
    initiatorIp: req ? req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null : null,
    userAgent: req ? req.headers["user-agent"] : null,
  });

  return logAuditEvent(entry);
}

async function logCrudEvent({ req, actor, action, entity, entityId, before = null, after = null, metadata = {}, result = "success" }) {
  return logAndSend({
    req,
    actor,
    scope: "admin_panel",
    action,
    entity,
    entityId,
    before,
    after,
    metadata,
    result,
  });
}

// Логирование отказа в доступе (401/403 из middleware).
async function logAccessDenied({ req, reason = "permission_denied", metadata = {} }) {
  return logAndSend({
    req,
    actor: buildActorFromRequest(req),
    scope: "admin_panel",
    action: "access.denied",
    entity: null,
    entityId: null,
    metadata: {
      path: req?.originalUrl || req?.url || null,
      method: req?.method || null,
      reason,
      ...metadata,
    },
    result: "failure",
  });
}

module.exports = {
  buildAuditEntry,
  logAuditEvent,
  logAndSend,
  logCrudEvent,
  logAccessDenied,
  buildActorFromRequest,
};

const auditRepository = require("./auditRepository");
const logger = require("../utils/logger");
