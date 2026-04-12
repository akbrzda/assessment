const handlers = require("./gamification-rules.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function list(req) {
  return runLegacyHandler(handlers.list, req);
}

async function getById(req) {
  return runLegacyHandler(handlers.getById, req);
}

async function create(req) {
  return runLegacyHandler(handlers.create, req);
}

async function update(req) {
  return runLegacyHandler(handlers.update, req);
}

async function remove(req) {
  return runLegacyHandler(handlers.remove, req);
}

async function dryRun(req) {
  return runLegacyHandler(handlers.dryRun, req);
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  dryRun,
};
