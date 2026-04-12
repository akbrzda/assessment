const handlers = require("./permissions.handlers.js");

async function getSystemModules(req, res, next) {
  return handlers.getSystemModules(req, res, next);
}

async function getUserPermissions(req, res, next) {
  return handlers.getUserPermissions(req, res, next);
}

async function updateUserPermissions(req, res, next) {
  return handlers.updateUserPermissions(req, res, next);
}

async function checkUserAccess(req, res, next) {
  return handlers.checkUserAccess(req, res, next);
}

module.exports = {
  getSystemModules,
  getUserPermissions,
  updateUserPermissions,
  checkUserAccess,
};


