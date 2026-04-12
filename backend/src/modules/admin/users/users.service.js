const handlers = require("./users.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function listUsers(req) {
  return runLegacyHandler(handlers.listUsers, req);
}

async function exportUsersToExcel(req) {
  return runLegacyHandler(handlers.exportUsersToExcel, req);
}

async function getUserDetailedStats(req) {
  return runLegacyHandler(handlers.getUserDetailedStats, req);
}

async function getUserById(req) {
  return runLegacyHandler(handlers.getUserById, req);
}

async function createUser(req) {
  return runLegacyHandler(handlers.createUser, req);
}

async function updateUser(req) {
  return runLegacyHandler(handlers.updateUser, req);
}

async function deleteUser(req) {
  return runLegacyHandler(handlers.deleteUser, req);
}

async function resetPassword(req) {
  return runLegacyHandler(handlers.resetPassword, req);
}

async function resetAssessmentProgress(req) {
  return runLegacyHandler(handlers.resetAssessmentProgress, req);
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
