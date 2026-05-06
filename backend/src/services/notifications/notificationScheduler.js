const cron = require("node-cron");
const logger = require("../../utils/logger");
const notificationService = require("./notificationService");
const notificationSender = require("./notificationSender");
const { pool } = require("../../config/database");
const certificateService = require("../certificates/certificateService");

const SCHEDULER_STATE_KEY = "__assessmentNotificationSchedulerState";
const schedulerState = global[SCHEDULER_STATE_KEY] || { tasks: [], startupTimer: null };
global[SCHEDULER_STATE_KEY] = schedulerState;

/**
 * Отправляет pending уведомления из очереди.
 */
async function processPendingNotifications() {
  try {
    const notifications = await notificationService.findPending(100);
    if (notifications.length > 0) {
      logger.info("Планировщик: отправка %d pending уведомлений", notifications.length);
      await notificationSender.sendBatch(notifications);
    }
  } catch (err) {
    logger.error("Планировщик: ошибка processPendingNotifications: %s", err.message);
  }
}

/**
 * Повторяет failed уведомления (attempt_count < 3).
 */
async function retryFailedNotifications() {
  try {
    const notifications = await notificationService.findFailed(50);
    if (notifications.length > 0) {
      logger.info("Планировщик: повтор %d failed уведомлений", notifications.length);
      await notificationSender.sendBatch(notifications);
    }
  } catch (err) {
    logger.error("Планировщик: ошибка retryFailedNotifications: %s", err.message);
  }
}

/**
 * Создаёт напоминания для незавершённых курсов.
 * Запускается каждые 4 часа. Не более 3 напоминаний на курс на пользователя.
 */
async function scheduleReminders() {
  try {
    // Системная настройка: минимум дней неактивности и максимум напоминаний
    const [[settingsRow]] = await pool.execute(
      `SELECT
         MAX(CASE WHEN setting_key = 'BOT_REMINDER_DAYS_INACTIVE' THEN CAST(setting_value AS UNSIGNED) END) AS inactiveDays,
         MAX(CASE WHEN setting_key = 'BOT_REMINDER_MAX_COUNT' THEN CAST(setting_value AS UNSIGNED) END) AS maxCount
       FROM system_settings
       WHERE setting_key IN ('BOT_REMINDER_DAYS_INACTIVE', 'BOT_REMINDER_MAX_COUNT')`,
    );
    const inactiveDays = settingsRow?.inactiveDays ?? 3;
    const maxCount = settingsRow?.maxCount ?? 3;

    // Пользователи с незавершёнными курсами и достаточной неактивностью
    const [rows] = await pool.execute(
      `SELECT
         cup.user_id, cup.course_id,
         u.first_name, co.title AS course_title,
         COALESCE(cup.deadline_at, co.availability_to) AS deadline,
         (
           SELECT COUNT(*) FROM bot_notifications bn
           WHERE bn.user_id = cup.user_id
             AND bn.entity_id = cup.course_id
             AND bn.type = 'course_reminder'
             AND bn.status != 'skipped'
         ) AS reminder_count
       FROM course_user_progress cup
       JOIN users u ON u.id = cup.user_id
       JOIN courses co ON co.id = cup.course_id
       WHERE cup.status IN ('in_progress', 'assigned')
         AND u.notifications_enabled = 1
         AND u.telegram_id IS NOT NULL
         AND (
           cup.last_activity_at IS NULL
           OR cup.last_activity_at < DATE_SUB(NOW(), INTERVAL ? DAY)
         )
         AND co.status = 'published'`,
      [inactiveDays],
    );

    let created = 0;
    for (const row of rows) {
      if (Number(row.reminder_count) >= maxCount) continue;

      const id = await notificationService.create({
        userId: row.user_id,
        type: "course_reminder",
        entityType: "course",
        entityId: row.course_id,
        payload: {
          firstName: row.first_name,
          courseTitle: row.course_title,
          deadline: row.deadline,
        },
      });
      if (id) created++;
    }

    if (created > 0) {
      logger.info("Планировщик: создано %d напоминаний о незавершённых курсах", created);
    }
  } catch (err) {
    logger.error("Планировщик: ошибка scheduleReminders: %s", err.message);
  }
}

/**
 * Создаёт напоминания об истекающих дедлайнах (за 7/3/1 день).
 * Запускается ежедневно в 09:00 (UTC+3 → 06:00 UTC для cron, но сервер использует TZ=UTC+3).
 * После наступления дедлайна создаёт deadline_missed для незавершённых.
 */
async function deadlineReminders() {
  try {
    // Напоминания за 7/3/1 день до дедлайна
    const [upcomingRows] = await pool.execute(
      `SELECT
         cup.user_id, cup.course_id,
         u.first_name, co.title AS course_title,
         COALESCE(cup.deadline_at, co.availability_to) AS deadline,
         DATEDIFF(COALESCE(cup.deadline_at, co.availability_to), CURDATE()) AS days_left
       FROM course_user_progress cup
       JOIN users u ON u.id = cup.user_id
       JOIN courses co ON co.id = cup.course_id
       WHERE cup.status IN ('in_progress', 'assigned')
         AND cup.progress_percent < 100
         AND u.notifications_enabled = 1
         AND u.telegram_id IS NOT NULL
         AND co.status = 'published'
         AND COALESCE(cup.deadline_at, co.availability_to) IS NOT NULL
         AND DATEDIFF(COALESCE(cup.deadline_at, co.availability_to), CURDATE()) IN (7, 3, 1)`,
    );

    let deadlineCreated = 0;
    for (const row of upcomingRows) {
      const id = await notificationService.create({
        userId: row.user_id,
        type: "deadline_reminder",
        entityType: "course",
        entityId: row.course_id,
        payload: {
          firstName: row.first_name,
          courseTitle: row.course_title,
          deadline: row.deadline,
          daysLeft: row.days_left,
        },
      });
      if (id) deadlineCreated++;
    }

    if (deadlineCreated > 0) {
      logger.info("Планировщик: создано %d напоминаний о дедлайнах", deadlineCreated);
    }

    // Пропущенный дедлайн — одно уведомление, если курс не завершён
    const [missedRows] = await pool.execute(
      `SELECT
         cup.user_id, cup.course_id,
         u.first_name, co.title AS course_title,
         COALESCE(cup.deadline_at, co.availability_to) AS deadline
       FROM course_user_progress cup
       JOIN users u ON u.id = cup.user_id
       JOIN courses co ON co.id = cup.course_id
       WHERE cup.status IN ('in_progress', 'assigned')
         AND u.notifications_enabled = 1
         AND u.telegram_id IS NOT NULL
         AND co.status = 'published'
         AND COALESCE(cup.deadline_at, co.availability_to) IS NOT NULL
         AND COALESCE(cup.deadline_at, co.availability_to) < CURDATE()`,
    );

    let missedCreated = 0;
    for (const row of missedRows) {
      const id = await notificationService.create({
        userId: row.user_id,
        type: "deadline_missed",
        entityType: "course",
        entityId: row.course_id,
        payload: {
          firstName: row.first_name,
          courseTitle: row.course_title,
          deadline: row.deadline,
        },
      });
      if (id) missedCreated++;
    }

    if (missedCreated > 0) {
      logger.info("Планировщик: создано %d уведомлений о пропущенных дедлайнах", missedCreated);
    }
  } catch (err) {
    logger.error("Планировщик: ошибка deadlineReminders: %s", err.message);
  }
}

/**
 * Повторяет генерацию сертификатов со статусом generation_failed.
 */
async function retryCertificates() {
  try {
    await certificateService.retryFailedCertificates();
  } catch (err) {
    logger.error("Планировщик: ошибка retryCertificates: %s", err.message);
  }
}

/**
 * Запускает все cron-задачи планировщика.
 * Вызывается один раз при старте сервера.
 */
function startNotificationScheduler() {
  if (schedulerState.tasks.length > 0) {
    logger.warn("Планировщик уведомлений уже запущен, повторный запуск пропущен");
    return;
  }

  // Запускаем первый прогон сразу через небольшую задержку после старта
  schedulerState.startupTimer = setTimeout(processPendingNotifications, 10_000);

  // Каждые 5 минут — обработка очереди pending
  schedulerState.tasks.push(cron.schedule("*/5 * * * *", processPendingNotifications));

  // Каждые 30 минут — повтор failed уведомлений
  schedulerState.tasks.push(cron.schedule("*/30 * * * *", retryFailedNotifications));

  // Каждые 4 часа — напоминания по незавершённым курсам
  schedulerState.tasks.push(cron.schedule("0 */4 * * *", scheduleReminders));

  // Ежедневно в 09:00 — напоминания о дедлайнах
  schedulerState.tasks.push(cron.schedule("0 9 * * *", deadlineReminders));

  // Каждые 15 минут — повтор генерации сертификатов
  schedulerState.tasks.push(cron.schedule("*/15 * * * *", retryCertificates));

  logger.info("Планировщик уведомлений запущен (node-cron)");
}

/**
 * Останавливает планировщик (для корректного завершения процесса).
 */
function stopNotificationScheduler() {
  if (schedulerState.startupTimer) {
    clearTimeout(schedulerState.startupTimer);
    schedulerState.startupTimer = null;
  }

  schedulerState.tasks.forEach((t) => t.stop());
  schedulerState.tasks.length = 0;
  logger.info("Планировщик уведомлений остановлен");
}

module.exports = { startNotificationScheduler, stopNotificationScheduler };
