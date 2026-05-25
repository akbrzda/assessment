const { pool } = require("../../../config/database");

async function getManagerBranchIds(userId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT branch_id AS branchId
       FROM branch_managers
      WHERE user_id = ?`,
    [userId],
  );

  return rows.map((item) => Number(item.branchId || 0)).filter((branchId) => branchId > 0);
}

async function getUserBranchId(userId) {
  const [rows] = await pool.query("SELECT branch_id FROM users WHERE id = ? LIMIT 1", [userId]);
  if (!rows.length) {
    return null;
  }

  return Number(rows[0].branch_id || 0) || 0;
}

async function getCourseChangelogTotal(courseId) {
  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total FROM audit_logs
      WHERE (entity_type = 'course' AND entity_id = ?)
         OR (entity_type IN ('course_section', 'course_topic')
             AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.courseId')) = ?)`,
    [courseId, String(courseId)],
  );

  return Number(countRow.total || 0);
}

async function listCourseChangelog(courseId, limit, offset) {
  const [rows] = await pool.query(
    `SELECT id, actor_user_id, actor_name, actor_role, action, entity_type,
            entity_id, before_json, after_json, metadata_json, status, created_at
       FROM audit_logs
      WHERE (entity_type = 'course' AND entity_id = ?)
         OR (entity_type IN ('course_section', 'course_topic')
             AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.courseId')) = ?)
      ORDER BY id DESC
      LIMIT ? OFFSET ?`,
    [courseId, String(courseId), limit, offset],
  );

  return rows;
}

module.exports = {
  getManagerBranchIds,
  getUserBranchId,
  getCourseChangelogTotal,
  listCourseChangelog,
};
