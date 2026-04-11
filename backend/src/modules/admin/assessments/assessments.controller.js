const assessmentsService = require("./assessments.service");
const {
  parseAssessmentId,
  normalizeListFilters,
} = require("./assessments.validators");

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

module.exports = {
  getAssessments,
  getAssessmentById,
};
