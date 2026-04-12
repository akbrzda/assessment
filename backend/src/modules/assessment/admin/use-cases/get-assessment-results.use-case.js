const writeHandlers = require("../assessments.write.handlers");

async function execute(req, res, next) {
  return writeHandlers.getAssessmentResults(req, res, next);
}

module.exports = {
  execute,
};
