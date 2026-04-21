const assessmentsService = require("./service");
const {
  parseAssessmentId,
  normalizeListFilters,
} = require("./validators");
const assessmentsWriteService = require("./write/service");

async function getAssessments(req, res, next) {
  try {
    const filters = normalizeListFilters(req.query, req.user);
    const result = await assessmentsService.getAssessments(filters);
    res.setHeader("X-Total-Count", String(result.total));
    res.json({
      assessments: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
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
    return await assessmentsWriteService.createAssessment(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateAssessment(req, res, next) {
  try {
    return await assessmentsWriteService.updateAssessment(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteAssessment(req, res, next) {
  try {
    return await assessmentsWriteService.deleteAssessment(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getAssessmentResults(req, res, next) {
  try {
    return await assessmentsWriteService.getAssessmentResults(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getAssessmentDetails(req, res, next) {
  try {
    return await assessmentsWriteService.getAssessmentDetails(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserAssessmentProgress(req, res, next) {
  try {
    return await assessmentsWriteService.getUserAssessmentProgress(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function exportAssessmentToExcel(req, res, next) {
  try {
    return await assessmentsWriteService.exportAssessmentToExcel(req, res, next);
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
