const createAssessmentUseCase = require("./use-cases/create-assessment.use-case");
const updateAssessmentUseCase = require("./use-cases/update-assessment.use-case");
const deleteAssessmentUseCase = require("./use-cases/delete-assessment.use-case");
const getAssessmentResultsUseCase = require("./use-cases/get-assessment-results.use-case");
const getAssessmentDetailsUseCase = require("./use-cases/get-assessment-details.use-case");
const getUserAssessmentProgressUseCase = require("./use-cases/get-user-assessment-progress.use-case");
const exportAssessmentToExcelUseCase = require("./use-cases/export-assessment-to-excel.use-case");

async function createAssessment(req) {
  return createAssessmentUseCase.execute(req);
}

async function updateAssessment(req) {
  return updateAssessmentUseCase.execute(req);
}

async function deleteAssessment(req) {
  return deleteAssessmentUseCase.execute(req);
}

async function getAssessmentResults(req) {
  return getAssessmentResultsUseCase.execute(req);
}

async function getAssessmentDetails(req) {
  return getAssessmentDetailsUseCase.execute(req);
}

async function getUserAssessmentProgress(req) {
  return getUserAssessmentProgressUseCase.execute(req);
}

async function exportAssessmentToExcel(req) {
  return exportAssessmentToExcelUseCase.execute(req);
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
