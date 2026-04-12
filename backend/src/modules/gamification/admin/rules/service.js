const manageRulesService = require("./manage/service");
const simulationRulesService = require("./simulation/service");

module.exports = {
  list: manageRulesService.list,
  getById: manageRulesService.getById,
  create: manageRulesService.create,
  update: manageRulesService.update,
  remove: manageRulesService.remove,
  dryRun: simulationRulesService.dryRun,
};
