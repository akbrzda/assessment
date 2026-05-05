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
    if (!telegramId) {
      return res.status(400).json({ error: "telegramId обязателен" });
    }
    const status = await botService.getUserStatusByTelegramId(telegramId);
    if (!status) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    res.json(status);
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
    if (!telegramId) {
      return res.status(400).json({ error: "telegramId обязателен" });
    }
    const certs = await certRepository.findAllByTelegramId(telegramId);
    res.json({ certificates: certs });
  } catch (err) {
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

module.exports = { getNotificationSettings, updateNotificationSettings, getUserStatus, getCertificatesByTelegramId, patchNotificationsByTelegramId };
