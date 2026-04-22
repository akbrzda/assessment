const badgesService = require("./service");

async function getBadges(req, res, next) {
  try {
    return await badgesService.getBadges(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getBadgeById(req, res, next) {
  try {
    return await badgesService.getBadgeById(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function createBadge(req, res, next) {
  try {
    return await badgesService.createBadge(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateBadge(req, res, next) {
  try {
    return await badgesService.updateBadge(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function uploadBadgeIcon(req, res, next) {
  try {
    return await badgesService.uploadBadgeIcon(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteBadge(req, res, next) {
  try {
    return await badgesService.deleteBadge(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function reorderBadges(req, res, next) {
  try {
    return await badgesService.reorderBadges(req, res, next);
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




