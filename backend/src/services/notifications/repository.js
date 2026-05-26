const { pool } = require("../../config/database");

async function findDuplicateActive({ userId, type, entityType = null, entityId = null }) {
  const [rows] = await pool.execute(
    `SELECT id FROM bot_notifications
     WHERE user_id = ? AND type = ? AND entity_type <=> ? AND entity_id <=> ?
       AND status IN ('pending', 'failed')
     LIMIT 1`,
    [userId, type, entityType, entityId],
  );
  return rows[0] || null;
}

async function insertNotification({ userId, type, entityType = null, entityId = null, payloadJson = null }) {
  const [result] = await pool.execute(
    `INSERT INTO bot_notifications (user_id, type, entity_type, entity_id, payload)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, type, entityType, entityId, payloadJson],
  );
  return result.insertId;
}

async function findPending(limit = 100) {
  const [rows] = await pool.execute(
    `SELECT
       bn.id, bn.user_id, bn.type, bn.entity_type, bn.entity_id,
       bn.attempt_count, bn.payload,
       u.telegram_id, u.first_name, u.timezone,
       u.notification_quiet_start, u.notification_quiet_end,
       u.notifications_enabled
     FROM bot_notifications bn
     JOIN users u ON u.id = bn.user_id
     WHERE bn.status = 'pending'
     ORDER BY bn.created_at ASC
     LIMIT ?`,
    [BigInt(limit)],
  );
  return rows;
}

async function findFailed(limit = 50) {
  const [rows] = await pool.execute(
    `SELECT
       bn.id, bn.user_id, bn.type, bn.entity_type, bn.entity_id,
       bn.attempt_count, bn.payload,
       u.telegram_id, u.first_name, u.timezone,
       u.notification_quiet_start, u.notification_quiet_end,
       u.notifications_enabled
     FROM bot_notifications bn
     JOIN users u ON u.id = bn.user_id
     WHERE bn.status = 'failed' AND bn.attempt_count < 3
     ORDER BY bn.last_attempt_at ASC
     LIMIT ?`,
    [BigInt(limit)],
  );
  return rows;
}

async function updateStatus(id, status, { errorMessage = null } = {}) {
  const sentAt = status === "sent" ? new Date() : null;
  await pool.execute(
    `UPDATE bot_notifications
     SET status = ?,
         attempt_count = attempt_count + 1,
         last_attempt_at = NOW(),
         sent_at = COALESCE(?, sent_at),
         error_message = ?
     WHERE id = ?`,
    [status, sentAt, errorMessage, id],
  );
}

async function findUserIdByNotificationId(id) {
  const [rows] = await pool.execute("SELECT user_id FROM bot_notifications WHERE id = ?", [id]);
  return rows[0]?.user_id || null;
}

async function disableUserNotificationsById(userId) {
  await pool.execute("UPDATE users SET notifications_enabled = 0 WHERE id = ?", [userId]);
}

async function skip(id) {
  await pool.execute(`UPDATE bot_notifications SET status = 'skipped', last_attempt_at = NOW() WHERE id = ?`, [id]);
}

async function countNewCourseTodayForUser(userId) {
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM bot_notifications
     WHERE user_id = ?
       AND type = 'new_course'
       AND DATE(created_at) = CURDATE()`,
    [userId],
  );
  return Number(row.total || 0);
}

module.exports = {
  findDuplicateActive,
  insertNotification,
  findPending,
  findFailed,
  updateStatus,
  findUserIdByNotificationId,
  disableUserNotificationsById,
  skip,
  countNewCourseTodayForUser,
};
