const handlers = require("./legacy.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function getAdminReferences(req) {
  return runLegacyHandler(handlers.getAdminReferences, req);
}

async function listUsers(req) {
  return runLegacyHandler(handlers.listUsers, req);
}

async function updateUser(req) {
  return runLegacyHandler(handlers.updateUser, req);
}

async function deleteUser(req) {
  return runLegacyHandler(handlers.deleteUser, req);
}

async function listBranches(req) {
  return runLegacyHandler(handlers.listBranches, req);
}

async function createBranch(req) {
  return runLegacyHandler(handlers.createBranch, req);
}

async function updateBranch(req) {
  return runLegacyHandler(handlers.updateBranch, req);
}

async function deleteBranch(req) {
  return runLegacyHandler(handlers.deleteBranch, req);
}

module.exports = {
  getAdminReferences,
  listUsers,
  updateUser,
  deleteUser,
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
};
