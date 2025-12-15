const { pool } = require("../config/database");
const logger = require("../utils/logger");
const { sendTelegramLog } = require("./telegramLogger");
const { emitNewLog } = require("./websocketService");

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

async function persistAuditEntry(entry) {
  const { actor, action, entity, entityId, metadata, result, scope, timestamp, initiatorIp, userAgent } = entry;

  const descriptionParts = [
    `Действие: ${action}`,
    entity ? `Сущность: ${entity}${entityId ? ` (#${entityId})` : ""}` : null,
    scope ? `Источник: ${scope}` : null,
    result ? `Статус: ${result}` : null,
  ].filter(Boolean);

  const description = descriptionParts.join(" | ");

  try {
    if (!actor.id) {
      logger.warn("Skip action_logs insert for %s: missing actor.id", action);
      return;
    }

    await pool.query(
      `INSERT INTO action_logs 
        (admin_id, admin_username, action_type, entity_type, entity_id, description, changes, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actor.id,
        actor.name,
        action,
        entity,
        entityId,
        description,
        JSON.stringify({
          metadata,
          result,
          scope,
          timestamp,
        }),
        initiatorIp,
        userAgent,
        new Date(timestamp),
      ]
    );
  } catch (error) {
    logger.error("Failed to persist audit entry: %s", error.message);
  }
}

async function logAuditEvent(entry, options = {}) {
  const { skipTelegram = false, skipDatabase = false, skipWebSocket = false } = options;

  if (!skipDatabase) {
    await persistAuditEntry(entry);
  }

  if (!skipTelegram) {
    await sendTelegramLog(entry);
  }

  // Отправляем лог через WebSocket для realtime-обновления
  if (!skipWebSocket) {
    try {
      emitNewLog({
        timestamp: entry.timestamp,
        action: entry.action,
        actor: entry.actor,
        entity: entry.entity,
        entityId: entry.entityId,
        result: entry.result,
        scope: entry.scope,
      });
    } catch (error) {
      logger.error("Failed to emit log via WebSocket: %s", error.message);
    }
  }
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
  skipTelegram = false,
  skipDatabase = false,
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

  await logAuditEvent(entry, { skipTelegram, skipDatabase });

  return entry;
}

module.exports = {
  buildAuditEntry,
  logAuditEvent,
  logAndSend,
  buildActorFromRequest,
};
