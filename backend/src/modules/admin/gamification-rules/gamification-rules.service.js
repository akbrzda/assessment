const handlers = require("./gamification-rules.handlers.js");

async function list(req, res, next) {
  return handlers.list(req, res, next);
}

async function getById(req, res, next) {
  return handlers.getById(req, res, next);
}

async function create(req, res, next) {
  return handlers.create(req, res, next);
}

async function update(req, res, next) {
  return handlers.update(req, res, next);
}

async function remove(req, res, next) {
  return handlers.remove(req, res, next);
}

async function dryRun(req, res, next) {
  return handlers.dryRun(req, res, next);
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  dryRun,
};
