const writeController = require("./controller");

async function createAssessment(req, res, next) {
  return writeController.createAssessment(req, res, next);
}

async function updateAssessment(req, res, next) {
  return writeController.updateAssessment(req, res, next);
}

async function deleteAssessment(req, res, next) {
  return writeController.deleteAssessment(req, res, next);
}

async function getAssessmentResults(req, res, next) {
  return writeController.getAssessmentResults(req, res, next);
}

async function getAssessmentDetails(req, res, next) {
  return writeController.getAssessmentDetails(req, res, next);
}

async function getUserAssessmentProgress(req, res, next) {
  return writeController.getUserAssessmentProgress(req, res, next);
}

async function exportAssessmentToExcel(req, res, next) {
  return writeController.exportAssessmentToExcel(req, res, next);
}

module.exports = {
  createAssessment,
  updateAssessment,
  deleteAssessment,
  getAssessmentResults,
  getAssessmentDetails,
  getUserAssessmentProgress,
  exportAssessmentToExcel,
};
