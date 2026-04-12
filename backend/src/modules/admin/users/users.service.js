const handlers = require("./users.handlers.js");

async function listUsers(req, res, next) {
  return handlers.listUsers(req, res, next);
}

async function exportUsersToExcel(req, res, next) {
  return handlers.exportUsersToExcel(req, res, next);
}

async function getUserDetailedStats(req, res, next) {
  return handlers.getUserDetailedStats(req, res, next);
}

async function getUserById(req, res, next) {
  return handlers.getUserById(req, res, next);
}

async function createUser(req, res, next) {
  return handlers.createUser(req, res, next);
}

async function updateUser(req, res, next) {
  return handlers.updateUser(req, res, next);
}

async function deleteUser(req, res, next) {
  return handlers.deleteUser(req, res, next);
}

async function resetPassword(req, res, next) {
  return handlers.resetPassword(req, res, next);
}

async function resetAssessmentProgress(req, res, next) {
  return handlers.resetAssessmentProgress(req, res, next);
}

module.exports = {
  listUsers,
  exportUsersToExcel,
  getUserDetailedStats,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  resetAssessmentProgress,
};
