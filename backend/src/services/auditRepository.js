const { pool } = require("../config/database");

async function createLog(entry) {
  const actorUserId = entry?.actor?.id ?? null;
  const actorRole = entry?.actor?.role ? String(entry.actor.role).slice(0, 64) : null;
  const actorName = entry?.actor?.name ? String(entry.actor.name).slice(0, 128) : null;
  const entityId = Number.isInteger(Number(entry?.entityId)) ? Number(entry.entityId) : null;

  const beforeJson = entry?.before != null ? JSON.stringify(entry.before) : null;
  const afterJson = entry?.after != null ? JSON.stringify(entry.after) : null;
  const metadataJson = entry?.metadata != null && Object.keys(entry.metadata).length > 0 ? JSON.stringify(entry.metadata) : null;

  const status = entry?.result === "failure" ? "failure" : "success";
  const scope = entry?.scope ? String(entry.scope).slice(0, 64) : "admin_panel";

  const payload = [
    actorUserId,
    actorRole,
    actorName,
    String(entry.action || ""),
    scope,
    entry.entity ? String(entry.entity) : null,
    entityId,
    beforeJson,
    afterJson,
    metadataJson,
    entry.initiatorIp ? String(entry.initiatorIp).slice(0, 45) : null,
    entry.userAgent ? String(entry.userAgent).slice(0, 512) : null,
    status,
  ];

  const [result] = await pool.query(
    `INSERT INTO audit_logs
      (actor_user_id, actor_role, actor_name, action, scope, entity_type, entity_id,
       before_json, after_json, metadata_json, ip_address, user_agent, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload,
  );

  return result.insertId;
}

module.exports = {
  createLog,
};
