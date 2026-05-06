const { pool } = require("../../../config/database");

async function findAll({ actorUserId, action, entityType, status, from, to, page, limit }) {
  const offset = (page - 1) * limit;
  const whereParts = ["1=1"];
  const params = [];

  if (actorUserId) {
    whereParts.push("actor_user_id = ?");
    params.push(actorUserId);
  }

  if (action) {
    whereParts.push("action LIKE ?");
    params.push(`%${action}%`);
  }

  if (entityType) {
    whereParts.push("entity_type = ?");
    params.push(entityType);
  }

  if (status) {
    whereParts.push("status = ?");
    params.push(status);
  }

  if (from) {
    whereParts.push("created_at >= ?");
    params.push(from);
  }

  if (to) {
    whereParts.push("created_at <= ?");
    params.push(to);
  }

  const where = `WHERE ${whereParts.join(" AND ")}`;

  const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, params);
  const total = Number(countRow?.total || 0);

  const [rows] = await pool.query(
    `SELECT id, actor_user_id, actor_role, actor_name, action, scope,
            entity_type, entity_id, status, metadata_json, ip_address, created_at
     FROM audit_logs
     ${where}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { items: rows, total };
}

async function findById(id) {
  const [[row]] = await pool.query("SELECT * FROM audit_logs WHERE id = ?", [id]);
  return row || null;
}

module.exports = {
  findAll,
  findById,
};
