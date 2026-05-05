const express = require("express");
const verifyInitData = require("../../middleware/verifyInitData");
const resolveUser = require("../../middleware/resolveUser");
const verifyBotToken = require("../../middleware/verifyBotToken");
const botController = require("./controller");

// Маршруты для MiniApp (авторизация через Telegram initData)
const publicRouter = express.Router();
publicRouter.use(verifyInitData, resolveUser);
publicRouter.get("/notifications/settings", botController.getNotificationSettings);
publicRouter.patch("/notifications/settings", botController.updateNotificationSettings);

// Внутренние маршруты для Telegram-бота (авторизация через BOT_TOKEN)
const internalRouter = express.Router();
internalRouter.use(verifyBotToken);
internalRouter.get("/user-status", botController.getUserStatus);
internalRouter.get("/certificates", botController.getCertificatesByTelegramId);
internalRouter.patch("/notifications/settings", botController.patchNotificationsByTelegramId);

module.exports = { publicRouter, internalRouter };
