const levelsService = require("./levels.service");

async function getLevels(req, res, next) {
  try {
    return await levelsService.getLevels(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getLevelsStats(req, res, next) {
  try {
    return await levelsService.getLevelsStats(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getLevelByNumber(req, res, next) {
  try {
    return await levelsService.getLevelByNumber(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function createLevel(req, res, next) {
  try {
    return await levelsService.createLevel(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateLevel(req, res, next) {
  try {
    return await levelsService.updateLevel(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteLevel(req, res, next) {
  try {
    return await levelsService.deleteLevel(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function recalculateLevels(req, res, next) {
  try {
    return await levelsService.recalculateLevels(req, res, next);
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


