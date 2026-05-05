const { pool } = require("../../config/database");

/**
 * Создаёт запись уведомления в очереди.
 * Возвращает id созданной записи или null при дублировании.
 */
async function create({ userId, type, entityType = null, entityId = null, payload = null }) {
  // Дедупликация: не создавать дубликат pending/failed для той же пары (user, type, entity)
  const [existing] = await pool.execute(
    `SELECT id FROM bot_notifications
     WHERE user_id = ? AND type = ? AND entity_type <=> ? AND entity_id <=> ?
       AND status IN ('pending', 'failed')
     LIMIT 1`,
    [userId, type, entityType, entityId],
  );

  if (existing.length > 0) {
    return null;
  }

  const payloadJson = payload ? JSON.stringify(payload) : null;
  const [result] = await pool.execute(
    `INSERT INTO bot_notifications (user_id, type, entity_type, entity_id, payload)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, type, entityType, entityId, payloadJson],
  );

  return result.insertId;
}

/**
 * Выбирает pending уведомления для отправки.
 * Включает данные пользователя для проверки тихих часов.
 */
async function findPending(limit = 100) {
  // mysql2 prepared statements требуют BigInt для LIMIT
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

/**
 * Выбирает failed уведомления для повторной попытки (attempt_count < 3).
 */
async function findFailed(limit = 50) {
  // mysql2 prepared statements требуют BigInt для LIMIT
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

/**
 * Обновляет статус уведомления.
 * При blocked — также отключает уведомления пользователю.
 */
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

  if (status === "blocked") {
    const [rows] = await pool.execute("SELECT user_id FROM bot_notifications WHERE id = ?", [id]);
    if (rows.length > 0) {
      await pool.execute("UPDATE users SET notifications_enabled = 0 WHERE id = ?", [rows[0].user_id]);
    }
  }
}

/**
 * Помечает уведомление как skipped (тихие часы, уже неактуально).
 */
async function skip(id) {
  await pool.execute(`UPDATE bot_notifications SET status = 'skipped', last_attempt_at = NOW() WHERE id = ?`, [id]);
}

/**
 * Считает количество уведомлений типа new_course, отправленных пользователю сегодня.
 * Используется для ограничения: не более 3 уведомлений о новых курсах в день.
 */
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

module.exports = { create, findPending, findFailed, updateStatus, skip, countNewCourseTodayForUser };
