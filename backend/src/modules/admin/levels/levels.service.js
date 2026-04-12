const handlers = require("./levels.handlers.js");

async function getLevels(req, res, next) {
  return handlers.getLevels(req, res, next);
}

async function getLevelsStats(req, res, next) {
  return handlers.getLevelsStats(req, res, next);
}

async function getLevelByNumber(req, res, next) {
  return handlers.getLevelByNumber(req, res, next);
}

async function createLevel(req, res, next) {
  return handlers.createLevel(req, res, next);
}

async function updateLevel(req, res, next) {
  return handlers.updateLevel(req, res, next);
}

async function deleteLevel(req, res, next) {
  return handlers.deleteLevel(req, res, next);
}

async function recalculateLevels(req, res, next) {
  return handlers.recalculateLevels(req, res, next);
}

module.exports = {
  getLevels,
  getLevelsStats,
  getLevelByNumber,
  createLevel,
  updateLevel,
  deleteLevel,
  recalculateLevels,
};


