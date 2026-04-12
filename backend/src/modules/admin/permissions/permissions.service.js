const handlers = require("./permissions.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function getSystemModules(req) {
  return runLegacyHandler(handlers.getSystemModules, req);
}

async function getUserPermissions(req) {
  return runLegacyHandler(handlers.getUserPermissions, req);
}

async function updateUserPermissions(req) {
  return runLegacyHandler(handlers.updateUserPermissions, req);
}

async function checkUserAccess(req) {
  return runLegacyHandler(handlers.checkUserAccess, req);
}

module.exports = {
  getSystemModules,
  getUserPermissions,
  updateUserPermissions,
  checkUserAccess,
};
