const createAssessmentUseCase = require("./use-cases/create-assessment.use-case");
const updateAssessmentUseCase = require("./use-cases/update-assessment.use-case");
const deleteAssessmentUseCase = require("./use-cases/delete-assessment.use-case");
const getAssessmentResultsUseCase = require("./use-cases/get-assessment-results.use-case");
const getAssessmentDetailsUseCase = require("./use-cases/get-assessment-details.use-case");
const getUserAssessmentProgressUseCase = require("./use-cases/get-user-assessment-progress.use-case");
const exportAssessmentToExcelUseCase = require("./use-cases/export-assessment-to-excel.use-case");

async function createAssessment(req, res, next) {
  return createAssessmentUseCase.execute(req, res, next);
}

async function updateAssessment(req, res, next) {
  return updateAssessmentUseCase.execute(req, res, next);
}

async function deleteAssessment(req, res, next) {
  return deleteAssessmentUseCase.execute(req, res, next);
}

async function getAssessmentResults(req, res, next) {
  return getAssessmentResultsUseCase.execute(req, res, next);
}

async function getAssessmentDetails(req, res, next) {
  return getAssessmentDetailsUseCase.execute(req, res, next);
}

async function getUserAssessmentProgress(req, res, next) {
  return getUserAssessmentProgressUseCase.execute(req, res, next);
}

async function exportAssessmentToExcel(req, res, next) {
  return exportAssessmentToExcelUseCase.execute(req, res, next);
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
