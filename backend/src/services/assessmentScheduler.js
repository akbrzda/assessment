const cron = require("node-cron");
const assessmentModel = require("../models/assessmentModel");
const userModel = require("../models/userModel");
const { sendUserNotification } = require("../services/telegramNotifier");
const { sendTelegramLog } = require("../services/telegramLogger");
const logger = require("../utils/logger");

/**
 * Scheduler для уведомлений об аттестациях
 * Проверяет и отправляет уведомления о:
 * - Открывшихся аттестациях
 * - Приближающихся дедлайнах
 */

// Отслеживание уже отправленных уведомлений
const sentNotifications = {
  opened: new Set(), // Уведомления об открытии
  deadline24h: new Set(), // За 24 часа до дедлайна
  deadline1h: new Set(), // За 1 час до дедлайна
};

/**
 * Проверка и отправка уведомлений об открывшихся аттестациях
 */
async function checkOpenedAssessments() {
  try {
    const now = new Date();

    // Получаем аттестации, которые только что открылись (в последние 5 минут)
    const recentlyOpened = await assessmentModel.getRecentlyOpenedAssessments(now);

    for (const assessment of recentlyOpened) {
      const notificationKey = `opened_${assessment.id}`;

      // Проверяем, не отправляли ли уже уведомление
      if (sentNotifications.opened.has(notificationKey)) {
        continue;
      }

      // Получаем список пользователей, которым назначена аттестация
      const assignedUserIds = await assessmentModel.listAssignedUserIds(assessment.id);

      if (assignedUserIds.length === 0) {
        continue;
      }

      const users = await userModel.findByIds(assignedUserIds);
      const usersWithTelegram = users.filter((user) => user.telegramId);

      if (usersWithTelegram.length === 0) {
        continue;
      }

      // Отправляем уведомления
      const message =
        `🔔 <b>Аттестация открыта!</b>\n` +
        `📝 ${assessment.title}\n` +
        `⏰ Закрытие: ${new Date(assessment.closeAt).toLocaleString("ru-RU")}\n` +
        `⏱ Время на прохождение: ${assessment.timeLimitMinutes} мин\n\n` +
        `Откройте приложение для прохождения!`;

      await Promise.allSettled(usersWithTelegram.map((user) => sendUserNotification(user.telegramId, message)));

      // Логируем в группу суперадмина
      await sendTelegramLog(`🔔 Отправлены уведомления об открытии аттестации "${assessment.title}" (${usersWithTelegram.length} чел.)`);

      // Отмечаем как отправленное
      sentNotifications.opened.add(notificationKey);

      logger.info(`Sent notifications for opened assessment ${assessment.id} to ${usersWithTelegram.length} users`);
    }
  } catch (error) {
    logger.error("Error checking opened assessments:", error);
  }
}

/**
 * Проверка и отправка уведомлений о приближающихся дедлайнах
 */
async function checkUpcomingDeadlines() {
  try {
    const now = new Date();

    // Получаем открытые аттестации
    const openAssessments = await assessmentModel.getOpenAssessments(now);

    for (const assessment of openAssessments) {
      const closeAt = new Date(assessment.closeAt);
      const timeUntilClose = closeAt - now;

      // За 24 часа до закрытия
      if (timeUntilClose <= 24 * 60 * 60 * 1000 && timeUntilClose > 23 * 60 * 60 * 1000) {
        const notificationKey = `deadline24h_${assessment.id}`;

        if (!sentNotifications.deadline24h.has(notificationKey)) {
          await sendDeadlineNotification(assessment, "24 часа");
          sentNotifications.deadline24h.add(notificationKey);
        }
      }

      // За 1 час до закрытия
      if (timeUntilClose <= 60 * 60 * 1000 && timeUntilClose > 55 * 60 * 1000) {
        const notificationKey = `deadline1h_${assessment.id}`;

        if (!sentNotifications.deadline1h.has(notificationKey)) {
          await sendDeadlineNotification(assessment, "1 час");
          sentNotifications.deadline1h.add(notificationKey);
        }
      }
    }
  } catch (error) {
    logger.error("Error checking upcoming deadlines:", error);
  }
}

/**
 * Отправка уведомления о приближающемся дедлайне
 */
async function sendDeadlineNotification(assessment, timeRemaining) {
  try {
    // Получаем пользователей, которые ещё не завершили аттестацию
    const incompleteUserIds = await assessmentModel.getUsersWithIncompleteAttempts(assessment.id);

    if (incompleteUserIds.length === 0) {
      return;
    }

    const users = await userModel.findByIds(incompleteUserIds);
    const usersWithTelegram = users.filter((user) => user.telegramId);

    if (usersWithTelegram.length === 0) {
      return;
    }

    const message =
      `⏰ <b>Напоминание о дедлайне!</b>\n` +
      `📝 ${assessment.title}\n` +
      `⏳ Осталось: ${timeRemaining}\n` +
      `🕐 Закрытие: ${new Date(assessment.closeAt).toLocaleString("ru-RU")}\n\n` +
      `Не забудьте пройти аттестацию!`;

    await Promise.allSettled(usersWithTelegram.map((user) => sendUserNotification(user.telegramId, message)));

    await sendTelegramLog(`⏰ Отправлены напоминания о дедлайне "${assessment.title}" (${timeRemaining}, ${usersWithTelegram.length} чел.)`);

    logger.info(`Sent deadline notifications for assessment ${assessment.id} to ${usersWithTelegram.length} users`);
  } catch (error) {
    logger.error(`Error sending deadline notification for assessment ${assessment.id}:`, error);
  }
}

/**
 * Очистка старых записей из кеша уведомлений
 */
function cleanupNotificationCache() {
  const maxCacheSize = 1000;

  if (sentNotifications.opened.size > maxCacheSize) {
    const toRemove = Array.from(sentNotifications.opened).slice(0, maxCacheSize / 2);
    toRemove.forEach((key) => sentNotifications.opened.delete(key));
  }

  if (sentNotifications.deadline24h.size > maxCacheSize) {
    const toRemove = Array.from(sentNotifications.deadline24h).slice(0, maxCacheSize / 2);
    toRemove.forEach((key) => sentNotifications.deadline24h.delete(key));
  }

  if (sentNotifications.deadline1h.size > maxCacheSize) {
    const toRemove = Array.from(sentNotifications.deadline1h).slice(0, maxCacheSize / 2);
    toRemove.forEach((key) => sentNotifications.deadline1h.delete(key));
  }
}

/**
 * Запуск всех scheduler'ов
 */
function startScheduler() {
  logger.info("Starting assessment notification scheduler...");

  // Проверка открывшихся аттестаций каждые 60 минут
  cron.schedule("*/60 * * * *", async () => {
    logger.info("Running opened assessments check...");
    await checkOpenedAssessments();
  });

  // Проверка приближающихся дедлайнов каждые 60 минут
  cron.schedule("*/60 * * * *", async () => {
    logger.info("Running upcoming deadlines check...");
    await checkUpcomingDeadlines();
  });

  // Очистка кеша каждый час
  cron.schedule("0 * * * *", () => {
    logger.info("Cleaning up notification cache...");
    cleanupNotificationCache();
  });

  logger.info("Assessment notification scheduler started successfully");

  // Запускаем первую проверку сразу (через 10 секунд после старта)
  setTimeout(() => {
    checkOpenedAssessments().catch((err) => logger.error("Initial opened check failed:", err));
    checkUpcomingDeadlines().catch((err) => logger.error("Initial deadline check failed:", err));
  }, 10000);
}

module.exports = {
  startScheduler,
  checkOpenedAssessments,
  checkUpcomingDeadlines,
};
