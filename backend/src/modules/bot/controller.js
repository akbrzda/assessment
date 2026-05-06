const botService = require("./service");
const certRepository = require("../certificates/repository");

async function getNotificationSettings(req, res, next) {
  try {
    const settings = await botService.getNotificationSettings(req.currentUser);
    res.json(settings);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

async function updateNotificationSettings(req, res, next) {
  try {
    const { notificationsEnabled, quietStart, quietEnd } = req.body;
    const settings = await botService.updateNotificationSettings(req.currentUser, {
      notificationsEnabled,
      quietStart,
      quietEnd,
    });
    res.json(settings);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

async function getUserStatus(req, res, next) {
  try {
    const telegramId = String(req.query.telegramId || "");
    console.log("[bot/internal/user-status] incoming telegramId=%s", telegramId);
    if (!telegramId) {
      console.log("[bot/internal/user-status] telegramId is empty");
      return res.status(400).json({ error: "telegramId обязателен" });
    }
    const status = await botService.getUserStatusByTelegramId(telegramId);
    console.log("[bot/internal/user-status] status result=%O", status);
    if (!status) {
      console.log("[bot/internal/user-status] user NOT found for telegramId=%s", telegramId);
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    console.log("[bot/internal/user-status] user found: firstName=%s, onboardingCompleted=%s", status.firstName, status.onboardingCompleted);
    res.json(status);
  } catch (err) {
    console.error("[bot/internal/user-status] error:", err.message);
    next(err);
  }
}

async function getOnboardingConfig(req, res, next) {
  try {
    const config = await botService.getOnboardingConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bot/internal/certificates?telegramId=X
 * Список issued сертификатов пользователя для Telegram-бота.
 */
async function getCertificatesByTelegramId(req, res, next) {
  try {
    const telegramId = String(req.query.telegramId || "");
    console.log("[bot/internal/certificates] incoming telegramId=%s", telegramId);
    if (!telegramId) {
      console.log("[bot/internal/certificates] telegramId is empty");
      return res.status(400).json({ error: "telegramId обязателен" });
    }
    const certs = await certRepository.findAllByTelegramId(telegramId);
    console.log("[bot/internal/certificates] found %d certificates", certs.length);
    certs.forEach((c, i) => {
      console.log("[bot/internal/certificates] cert[%d]: uuid=%s, course=%s, issued=%s", i, c.uuid, c.course_title, c.issued_at);
    });
    res.json({ certificates: certs });
  } catch (err) {
    console.error("[bot/internal/certificates] error:", err.message);
    next(err);
  }
}

/**
 * PATCH /api/bot/internal/notifications/settings?telegramId=X
 * Обновление настроек уведомлений пользователя из бота.
 */
async function patchNotificationsByTelegramId(req, res, next) {
  try {
    const telegramId = String(req.query.telegramId || "");
    if (!telegramId) {
      return res.status(400).json({ error: "telegramId обязателен" });
    }
    const { notificationsEnabled } = req.body;
    if (notificationsEnabled === undefined) {
      return res.status(400).json({ error: "notificationsEnabled обязателен" });
    }
    await botService.patchNotificationsByTelegramId(telegramId, Boolean(notificationsEnabled));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  getUserStatus,
  getOnboardingConfig,
  getCertificatesByTelegramId,
  patchNotificationsByTelegramId,
};
