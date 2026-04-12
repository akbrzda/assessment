const levelsService = require("./levels.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function getLevels(req, res, next) {
  try {
    const result = await levelsService.getLevels(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getLevelsStats(req, res, next) {
  try {
    const result = await levelsService.getLevelsStats(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getLevelByNumber(req, res, next) {
  try {
    const result = await levelsService.getLevelByNumber(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function createLevel(req, res, next) {
  try {
    const result = await levelsService.createLevel(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateLevel(req, res, next) {
  try {
    const result = await levelsService.updateLevel(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteLevel(req, res, next) {
  try {
    const result = await levelsService.deleteLevel(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function recalculateLevels(req, res, next) {
  try {
    const result = await levelsService.recalculateLevels(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
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
