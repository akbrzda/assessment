const writeHandlers = require("../assessments.write.handlers");

async function execute(req, res, next) {
  return writeHandlers.createAssessment(req, res, next);
}

module.exports = {
  execute,
};
