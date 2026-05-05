const { pool } = require("../config/database");
const logger = require("../utils/logger");
const appEvents = require("./appEvents");
const notificationService = require("../services/notifications/notificationService");
const notificationSender = require("../services/notifications/notificationSender");
const certificateService = require("../services/certificates/certificateService");

/**
 * Находит курс, у которого данная аттестация является итоговой.
 * Возвращает { courseId, courseTitle } или null.
 */
async function findCourseByFinalAssessment(assessmentId) {
  const [rows] = await pool.execute(`SELECT id, title FROM courses WHERE final_assessment_id = ? AND status = 'published' LIMIT 1`, [assessmentId]);
  if (!rows.length) return null;
  return { courseId: rows[0].id, courseTitle: rows[0].title };
}

/**
 * Получает данные пользователя, необходимые для формирования уведомления.
 */
async function getUserForNotification(userId) {
  const [rows] = await pool.execute(
    `SELECT id, first_name, last_name, telegram_id, notifications_enabled,
            timezone, notification_quiet_start, notification_quiet_end
     FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  if (!rows.length) return null;
  return rows[0];
}

/**
 * Считает количество оставшихся попыток у пользователя по данной аттестации.
 */
async function countRemainingAttempts(userId, assessmentId) {
  const [[attemptRow]] = await pool.execute("SELECT COUNT(*) AS total FROM assessment_attempts WHERE assessment_id = ? AND user_id = ?", [
    assessmentId,
    userId,
  ]);
  const [[assessmentRow]] = await pool.execute("SELECT max_attempts FROM assessments WHERE id = ? LIMIT 1", [assessmentId]);
  const maxAttempts = assessmentRow ? Number(assessmentRow.max_attempts || 0) : 0;
  const used = Number(attemptRow.total || 0);
  if (maxAttempts === 0) return null; // безлимит
  return Math.max(maxAttempts - used, 0);
}

/**
 * Обрабатывает событие завершения попытки: создаёт уведомление и немедленно отправляет его.
 */
async function handleAttemptCompleted({ userId, assessmentId, attemptId, attemptNumber, scorePercent, passScorePercent, passed }) {
  try {
    const courseInfo = await findCourseByFinalAssessment(assessmentId);
    if (!courseInfo) {
      // Аттестация не является итоговой ни для одного курса — уведомление не нужно
      return;
    }

    const user = await getUserForNotification(userId);
    if (!user) {
      logger.warn("assessmentEvents: пользователь не найден userId=%s", userId);
      return;
    }

    const type = passed ? "result_passed" : "result_failed";
    const remainingAttempts = passed ? null : await countRemainingAttempts(userId, assessmentId);

    const notificationId = await notificationService.create({
      userId,
      type,
      entityType: "course",
      entityId: courseInfo.courseId,
      payload: {
        firstName: user.first_name,
        courseTitle: courseInfo.courseTitle,
        courseId: courseInfo.courseId,
        scorePercent,
        passScorePercent,
        remainingAttempts,
      },
    });

    if (!notificationId) {
      logger.debug("assessmentEvents: уведомление type=%s уже существует для userId=%s", type, userId);
      return;
    }

    // Немедленная отправка — не ждём cron
    const [rows] = await pool.execute(
      `SELECT
         bn.id, bn.user_id, bn.type, bn.entity_type, bn.entity_id,
         bn.attempt_count, bn.payload,
         u.telegram_id, u.first_name, u.timezone,
         u.notification_quiet_start, u.notification_quiet_end,
         u.notifications_enabled
       FROM bot_notifications bn
       JOIN users u ON u.id = bn.user_id
       WHERE bn.id = ? LIMIT 1`,
      [notificationId],
    );

    if (rows.length) {
      await notificationSender.sendOne(rows[0]);
    }

    // Генерируем сертификат при успешном прохождении (если курс поддерживает)
    if (passed) {
      const [[courseRow]] = await pool.execute(`SELECT certificate_enabled FROM courses WHERE id = ? LIMIT 1`, [courseInfo.courseId]);
      if (courseRow?.certificate_enabled) {
        const cert = await certificateService.generateCertificate(userId, courseInfo.courseId, attemptId, {
          firstName: user.first_name,
          lastName: user.last_name,
          courseTitle: courseInfo.courseTitle,
          scorePercent,
        });

        if (cert?.status === "issued") {
          await notificationService.create({
            userId,
            type: "certificate_ready",
            entityType: "course",
            entityId: courseInfo.courseId,
            payload: {
              firstName: user.first_name,
              courseTitle: courseInfo.courseTitle,
              uuid: cert.uuid,
            },
          });
        }
      }
    }
  } catch (err) {
    logger.error("assessmentEvents: ошибка обработки attempt.completed userId=%s assessmentId=%s: %s", userId, assessmentId, err.message);
  }
}

/**
 * Регистрирует обработчики событий аттестации.
 * Вызывается один раз при старте приложения.
 */
function registerAssessmentEvents() {
  appEvents.on("attempt.completed", handleAttemptCompleted);
  logger.info("assessmentEvents: обработчики событий зарегистрированы");
}

module.exports = { registerAssessmentEvents };
