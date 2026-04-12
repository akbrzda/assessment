const adminRulesController = require("../../../controllers/adminGamificationRulesController");
const rulesDryRunController = require("../../../controllers/gamificationRulesController");

module.exports = {
  list: adminRulesController.list,
  getById: adminRulesController.getById,
  create: adminRulesController.create,
  update: adminRulesController.update,
  remove: adminRulesController.remove,
  dryRun: rulesDryRunController.dryRun,
};
