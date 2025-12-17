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
    result,
    initiatorIp,
    userAgent,
  };
}

async function logAuditEvent(entry) {
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
  result = "success",
}) {
  const entry = buildAuditEntry({
    scope,
    action,
    entity,
    entityId,
    actor,
    metadata,
    result,
    initiatorIp: req ? req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null : null,
    userAgent: req ? req.headers["user-agent"] : null,
  });

  return logAuditEvent(entry);
}

module.exports = {
  buildAuditEntry,
  logAuditEvent,
  logAndSend,
  buildActorFromRequest,
};
