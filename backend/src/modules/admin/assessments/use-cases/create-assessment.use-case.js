const writeHandlers = require("../assessments.write.handlers");
const { runLegacyHandler } = require("../../shared/legacy-handler-adapter");

async function execute(req) {
  return runLegacyHandler(writeHandlers.createAssessment, req);
}

module.exports = {
  execute,
};
