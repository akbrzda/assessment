const { pool } = require("../../config/database");

/**
 * Возвращает настройки уведомлений пользователя.
 */
async function getNotificationSettings(userId) {
  const [rows] = await pool.execute(
    `SELECT notifications_enabled, notification_quiet_start, notification_quiet_end
     FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

/**
 * Обновляет настройки уведомлений пользователя.
 */
async function updateNotificationSettings(userId, { notificationsEnabled, quietStart, quietEnd }) {
  const fields = [];
  const values = [];

  if (notificationsEnabled !== undefined) {
    fields.push("notifications_enabled = ?");
    values.push(notificationsEnabled ? 1 : 0);
  }
  if (quietStart !== undefined) {
    fields.push("notification_quiet_start = ?");
    values.push(quietStart);
  }
  if (quietEnd !== undefined) {
    fields.push("notification_quiet_end = ?");
    values.push(quietEnd);
  }

  if (fields.length === 0) {
    return;
  }

  values.push(userId);
  await pool.execute(`UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`, values);
}

/**
 * Возвращает краткий статус пользователя для внутреннего проверхи бота.
 */
async function getUserStatusByTelegramId(telegramId) {
  console.log("[botRepository.getUserStatusByTelegramId] executing query for telegramId=%s", telegramId);
  const [rows] = await pool.execute(
    `SELECT id, first_name, last_name, notifications_enabled, onboarding_completed_at
     FROM users
     WHERE telegram_id = ?
     LIMIT 1`,
    [telegramId],
  );
  console.log("[botRepository.getUserStatusByTelegramId] query returned %d rows", rows.length);
  if (rows.length > 0) {
    console.log(
      "[botRepository.getUserStatusByTelegramId] found user: id=%s, first_name=%s, telegram_id will search=%s",
      rows[0].id,
      rows[0].first_name,
      telegramId,
    );
  }
  return rows[0] || null;
}

module.exports = { getNotificationSettings, updateNotificationSettings, getUserStatusByTelegramId };
