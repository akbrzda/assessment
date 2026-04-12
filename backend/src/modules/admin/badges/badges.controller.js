const badgesService = require("./badges.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function getBadges(req, res, next) {
  try {
    const result = await badgesService.getBadges(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getBadgeById(req, res, next) {
  try {
    const result = await badgesService.getBadgeById(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function createBadge(req, res, next) {
  try {
    const result = await badgesService.createBadge(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateBadge(req, res, next) {
  try {
    const result = await badgesService.updateBadge(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function uploadBadgeIcon(req, res, next) {
  try {
    const result = await badgesService.uploadBadgeIcon(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteBadge(req, res, next) {
  try {
    const result = await badgesService.deleteBadge(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function reorderBadges(req, res, next) {
  try {
    const result = await badgesService.reorderBadges(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBadges,
  getBadgeById,
  createBadge,
  updateBadge,
  uploadBadgeIcon,
  deleteBadge,
  reorderBadges,
};
