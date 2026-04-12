const handlers = require("./levels.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function getLevels(req) {
  return runLegacyHandler(handlers.getLevels, req);
}

async function getLevelsStats(req) {
  return runLegacyHandler(handlers.getLevelsStats, req);
}

async function getLevelByNumber(req) {
  return runLegacyHandler(handlers.getLevelByNumber, req);
}

async function createLevel(req) {
  return runLegacyHandler(handlers.createLevel, req);
}

async function updateLevel(req) {
  return runLegacyHandler(handlers.updateLevel, req);
}

async function deleteLevel(req) {
  return runLegacyHandler(handlers.deleteLevel, req);
}

async function recalculateLevels(req) {
  return runLegacyHandler(handlers.recalculateLevels, req);
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
