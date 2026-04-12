const handlers = require("./badges.handlers.js");

async function getBadges(req, res, next) {
  return handlers.getBadges(req, res, next);
}

async function getBadgeById(req, res, next) {
  return handlers.getBadgeById(req, res, next);
}

async function createBadge(req, res, next) {
  return handlers.createBadge(req, res, next);
}

async function updateBadge(req, res, next) {
  return handlers.updateBadge(req, res, next);
}

async function uploadBadgeIcon(req, res, next) {
  return handlers.uploadBadgeIcon(req, res, next);
}

async function deleteBadge(req, res, next) {
  return handlers.deleteBadge(req, res, next);
}

async function reorderBadges(req, res, next) {
  return handlers.reorderBadges(req, res, next);
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


