const assessmentsService = require("./assessments.service");
const {
  parseAssessmentId,
  normalizeListFilters,
} = require("./assessments.validators");
const assessmentsWriteService = require("./assessments.write.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function getAssessments(req, res, next) {
  try {
    const filters = normalizeListFilters(req.query, req.user);
    const assessments = await assessmentsService.getAssessments(filters);
    res.json({ assessments });
  } catch (error) {
    next(error);
  }
}

async function getAssessmentById(req, res, next) {
  try {
    const assessmentId = parseAssessmentId(req.params.id);
    const payload = await assessmentsService.getAssessmentById(assessmentId);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

async function createAssessment(req, res, next) {
  try {
    const result = await assessmentsWriteService.createAssessment(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateAssessment(req, res, next) {
  try {
    const result = await assessmentsWriteService.updateAssessment(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteAssessment(req, res, next) {
  try {
    const result = await assessmentsWriteService.deleteAssessment(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getAssessmentResults(req, res, next) {
  try {
    const result = await assessmentsWriteService.getAssessmentResults(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getAssessmentDetails(req, res, next) {
  try {
    const result = await assessmentsWriteService.getAssessmentDetails(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getUserAssessmentProgress(req, res, next) {
  try {
    const result = await assessmentsWriteService.getUserAssessmentProgress(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function exportAssessmentToExcel(req, res, next) {
  try {
    const result = await assessmentsWriteService.exportAssessmentToExcel(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  getAssessmentResults,
  getAssessmentDetails,
  getUserAssessmentProgress,
  exportAssessmentToExcel,
};
