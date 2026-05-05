const botRepository = require("./repository");

function buildError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * Возвращает настройки уведомлений текущего пользователя.
 */
async function getNotificationSettings(currentUser) {
  if (!currentUser) {
    throw buildError("Пользователь не найден", 404);
  }

  const settings = await botRepository.getNotificationSettings(currentUser.id);
  if (!settings) {
    throw buildError("Пользователь не найден", 404);
  }

  return {
    notificationsEnabled: Boolean(settings.notifications_enabled),
    quietStart: settings.notification_quiet_start || "22:00:00",
    quietEnd: settings.notification_quiet_end || "09:00:00",
  };
}

/**
 * Обновляет настройки уведомлений текущего пользователя.
 */
async function updateNotificationSettings(currentUser, payload) {
  if (!currentUser) {
    throw buildError("Пользователь не найден", 404);
  }

  const { notificationsEnabled, quietStart, quietEnd } = payload;

  // Валидация формата времени HH:MM или HH:MM:SS
  const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
  if (quietStart !== undefined && !timeRegex.test(quietStart)) {
    throw buildError("Некорректный формат quietStart (ожидается HH:MM)", 400);
  }
  if (quietEnd !== undefined && !timeRegex.test(quietEnd)) {
    throw buildError("Некорректный формат quietEnd (ожидается HH:MM)", 400);
  }

  await botRepository.updateNotificationSettings(currentUser.id, {
    notificationsEnabled,
    quietStart,
    quietEnd,
  });

  return getNotificationSettings(currentUser);
}

/**
 * Возвращает статус пользователя для внутренней проверки ботом.
 */
async function getUserStatusByTelegramId(telegramId) {
  const row = await botRepository.getUserStatusByTelegramId(telegramId);
  if (!row) {
    return null;
  }
  return {
    found: true,
    onboardingCompleted: Boolean(row.onboarding_completed_at),
  };
}

/**
 * Обновляет notificationsEnabled по telegramId (для Telegram-бота без initData).
 */
async function patchNotificationsByTelegramId(telegramId, notificationsEnabled) {
  const row = await botRepository.getUserStatusByTelegramId(telegramId);
  if (!row) {
    throw buildError("Пользователь не найден", 404);
  }
  await botRepository.updateNotificationSettings(row.id, { notificationsEnabled });
}

module.exports = { getNotificationSettings, updateNotificationSettings, getUserStatusByTelegramId, patchNotificationsByTelegramId };
