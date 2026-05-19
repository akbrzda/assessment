const userModel = require('../models/userModel');

async function resolveUser(req, res, next) {
  const telegramUser = req.telegramInitData?.user;
  if (!telegramUser) {
    req.currentUser = null;
    return next();
  }

  try {
    const platform = req.clientPlatform === "max" ? "max" : "telegram";
    const platformUserId = String(telegramUser.id);
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
        avatarUrl: user.avatarUrl
      };
    } else {
      req.currentUser = null;
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = resolveUser;
