const levelsController = require("../../../controllers/levelsController");

module.exports = {
  getLevels: levelsController.getLevels,
  getLevelsStats: levelsController.getLevelsStats,
  getLevelByNumber: levelsController.getLevelByNumber,
  createLevel: levelsController.createLevel,
  updateLevel: levelsController.updateLevel,
  deleteLevel: levelsController.deleteLevel,
  recalculateLevels: levelsController.recalculateLevels,
};
