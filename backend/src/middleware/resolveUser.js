const userModel = require("../models/userModel");
const logger = require("../utils/logger");

async function resolveUser(req, res, next) {
  const telegramUser = req.telegramInitData?.user;
  if (!telegramUser) {
    logger.warn("[resolveUser] нет данных пользователя в initData", {
      platform: req.clientPlatform || null,
      url: req.originalUrl,
    });
    req.currentUser = null;
    return next();
  }

  try {
    const platform = req.clientPlatform === "max" ? "max" : "telegram";
    const platformUserId = String(telegramUser.id);

    logger.info("[resolveUser] поиск пользователя по platform identity", {
      platform,
      platformUserId,
      url: req.originalUrl,
    });

    const user = await userModel.findByPlatformIdentity(platform, platformUserId);
    if (user) {
      if (!user.avatarUrl && telegramUser.photo_url) {
        try {
          await userModel.updateAvatar(user.id, telegramUser.photo_url);
          user.avatarUrl = telegramUser.photo_url;
        } catch (updateError) {
          // silent fail
        }
      }
      req.currentUser = {
        id: user.id,
        telegramId: user.telegramId,
        platform,
        platformUserId,
        roleId: user.roleId,
        roleName: user.roleName,
        branchId: user.branchId,
        positionId: user.positionId,
        level: user.level,
        points: user.points,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      };
      logger.info("[resolveUser] пользователь найден — уже зарегистрирован", {
        platform,
        platformUserId,
        userId: user.id,
        roleName: user.roleName,
      });
    } else {
      req.currentUser = null;
      logger.info("[resolveUser] пользователь не найден — не зарегистрирован", {
        platform,
        platformUserId,
      });
    }
    next();
  } catch (error) {
    logger.error("[resolveUser] ошибка поиска пользователя", {
      platform: req.clientPlatform || null,
      error: error.message,
    });
    next(error);
  }
}

module.exports = resolveUser;
