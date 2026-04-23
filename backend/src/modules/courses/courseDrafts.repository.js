const { pool } = require("../../config/database");

function mapDraftRow(row) {
  if (!row) return null;

  let payload = null;
  if (row.draft_payload) {
    try {
      payload = JSON.parse(row.draft_payload);
    } catch {
      payload = null;
    }
  }

  return {
    id: Number(row.id),
    courseId: Number(row.course_id),
    versionLabel: row.version_label || null,
    payload,
    createdBy: Number(row.created_by),
    updatedBy: Number(row.updated_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findByCourseId(courseId, options = {}) {
  const executor = options.connection || pool;
  const lock = options.forUpdate ? " FOR UPDATE" : "";
  const [rows] = await executor.execute(
    `SELECT id, course_id, draft_payload, version_label, created_by, updated_by, created_at, updated_at
       FROM course_drafts
      WHERE course_id = ?${lock}`,
    [courseId],
  );
  return mapDraftRow(rows[0]);
}

async function upsertByCourseId(courseId, payload, versionLabel, userId, connection) {
  const serializedPayload = JSON.stringify(payload || {});
  const normalizedVersionLabel = versionLabel ? String(versionLabel).trim().slice(0, 64) : null;

  await connection.execute(
    `INSERT INTO course_drafts (course_id, draft_payload, version_label, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       draft_payload = VALUES(draft_payload),
       version_label = VALUES(version_label),
       updated_by = VALUES(updated_by),
       updated_at = UTC_TIMESTAMP()`,
    [courseId, serializedPayload, normalizedVersionLabel, userId, userId],
  );
}

async function deleteByCourseId(courseId, connection) {
  const [result] = await connection.execute("DELETE FROM course_drafts WHERE course_id = ?", [courseId]);
  return Number(result.affectedRows || 0);
}

module.exports = {
  findByCourseId,
  upsertByCourseId,
  deleteByCourseId,
};
