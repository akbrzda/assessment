const { pool } = require("../config/database");

async function createLog(entry) {
  const actorUserId = entry?.actor?.id ?? null;
  const entityId = Number.isInteger(Number(entry?.entityId)) ? Number(entry.entityId) : null;

  const beforeJson = entry?.before != null ? JSON.stringify(entry.before) : null;
  const afterJson = entry?.after != null ? JSON.stringify(entry.after) : entry?.metadata ? JSON.stringify(entry.metadata) : null;

  const payload = [
    actorUserId,
    String(entry.action || ""),
    entry.entity ? String(entry.entity) : null,
    entityId,
    beforeJson,
    afterJson,
    entry.initiatorIp ? String(entry.initiatorIp).slice(0, 45) : null,
    entry.userAgent ? String(entry.userAgent).slice(0, 512) : null,
  ];

  const [result] = await pool.query(
    `INSERT INTO audit_logs
      (actor_user_id, action, entity_type, entity_id, before_json, after_json, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    payload,
  );

  return result.insertId;
}

module.exports = {
  createLog,
};
