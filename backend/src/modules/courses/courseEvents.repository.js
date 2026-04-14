const { pool } = require("../../config/database");

/**
 * Записать аналитическое событие курса.
 * Выполняется вне транзакции основного потока — ошибки логируются, но не прерывают основную логику.
 */
async function insertCourseEvent({ courseId, userId, eventType, payload = null }) {
  try {
    await pool.execute(
      `INSERT INTO course_events (course_id, user_id, event_type, payload, created_at)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
      [courseId, userId, eventType, payload ? JSON.stringify(payload) : null],
    );
  } catch (error) {
    console.error("[courseEvents] Ошибка записи события:", eventType, error.message);
  }
}

module.exports = { insertCourseEvent };
