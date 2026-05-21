const botRepository = require("./repository");
const settingsService = require("../../services/settingsService");
const logger = require("../../utils/logger");

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
  logger.debug("[botService.getUserStatusByTelegramId] searching user status");
  const row = await botRepository.getUserStatusByTelegramId(telegramId);
  if (!row) {
    logger.debug("[botService.getUserStatusByTelegramId] user not found");
    return null;
  }
  const result = {
    found: true,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    notificationsEnabled: Boolean(row.notifications_enabled),
    onboardingCompleted: Boolean(row.onboarding_completed_at),
  };
  logger.debug("[botService.getUserStatusByTelegramId] status resolved");
  return result;
}

async function getOnboardingConfig() {
  const [onboardingTitle, onboardingBody, onboardingStep2, onboardingStep3, onboardingCtaText, mainMenuText, helpText, guestNoInviteText] =
    await Promise.all([
      settingsService.getSetting("BOT_ONBOARDING_TITLE", "👋 Привет{{name}}!"),
      settingsService.getSetting(
        "BOT_ONBOARDING_BODY",
        "Я бот системы аттестации. Здесь вы будете:\n📚 Проходить обучающие курсы\n✅ Сдавать тесты и аттестации\n🏆 Получать баллы и бейджи\n📄 Получать сертификаты",
      ),
      settingsService.getSetting(
        "BOT_ONBOARDING_STEP_2",
        "Как это работает:\n1) Откройте назначенный курс\n2) Изучите материалы\n3) Пройдите тест\n4) Получите результат и сертификат",
      ),
      settingsService.getSetting(
        "BOT_ONBOARDING_STEP_3",
        "Совет для быстрого старта:\n• Начните с ближайшего назначенного курса\n• Проходите обучение регулярно\n• Используйте /help для подсказок",
      ),
      settingsService.getSetting("BOT_ONBOARDING_CTA_TEXT", "Открыть приложение"),
      settingsService.getSetting("BOT_MAIN_MENU_TEXT", "Привет{{name}}! 👋\n\nЧто хотите сделать?"),
      settingsService.getSetting(
        "BOT_HELP_TEXT",
        "Доступные команды:\n/start — главное меню\n/certificate — последний сертификат\n/certificates — все сертификаты\n/help — подсказка",
      ),
      settingsService.getSetting(
        "BOT_GUEST_NO_INVITE_TEXT",
        "Для доступа к системе нужна персональная ссылка-приглашение. Попросите руководителя или администратора отправить её в Telegram или MAX.",
      ),
    ]);

  return {
    onboardingTitle: String(onboardingTitle || ""),
    onboardingBody: String(onboardingBody || ""),
    onboardingStep2: String(onboardingStep2 || ""),
    onboardingStep3: String(onboardingStep3 || ""),
    onboardingCtaText: String(onboardingCtaText || "Открыть приложение"),
    mainMenuText: String(mainMenuText || ""),
    helpText: String(helpText || ""),
    guestNoInviteText: String(guestNoInviteText || ""),
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

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  getUserStatusByTelegramId,
  getOnboardingConfig,
  patchNotificationsByTelegramId,
};
