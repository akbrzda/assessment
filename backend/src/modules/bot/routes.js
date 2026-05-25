const express = require("express");
const verifyInitData = require("../../middleware/verifyInitData");
const resolveUser = require("../../middleware/resolveUser");
const botController = require("./controller");

// Маршруты для MiniApp (авторизация через Telegram initData)
const publicRouter = express.Router();
publicRouter.get("/notifications/settings", verifyInitData, resolveUser, botController.getNotificationSettings);
publicRouter.patch("/notifications/settings", verifyInitData, resolveUser, botController.updateNotificationSettings);

// Служебные маршруты Telegram-бота
publicRouter.get("/user-status", botController.getUserStatus);
publicRouter.get("/onboarding-config", botController.getOnboardingConfig);
publicRouter.get("/certificates", botController.getCertificatesByTelegramId);
publicRouter.patch("/notifications/settings/by-telegram-id", botController.patchNotificationsByTelegramId);

module.exports = { publicRouter };
