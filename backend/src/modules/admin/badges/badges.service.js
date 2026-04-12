const handlers = require("./badges.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function getBadges(req) {
  return runLegacyHandler(handlers.getBadges, req);
}

async function getBadgeById(req) {
  return runLegacyHandler(handlers.getBadgeById, req);
}

async function createBadge(req) {
  return runLegacyHandler(handlers.createBadge, req);
}

async function updateBadge(req) {
  return runLegacyHandler(handlers.updateBadge, req);
}

async function uploadBadgeIcon(req) {
  return runLegacyHandler(handlers.uploadBadgeIcon, req);
}

async function deleteBadge(req) {
  return runLegacyHandler(handlers.deleteBadge, req);
}

async function reorderBadges(req) {
  return runLegacyHandler(handlers.reorderBadges, req);
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
