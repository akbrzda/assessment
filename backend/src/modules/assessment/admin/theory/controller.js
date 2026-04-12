const theoryService = require("./service");
const {
  parseAssessmentId,
  validateDraftPayload,
  validatePublishPayload,
} = require("./validators");

async function getTheory(req, res, next) {
  try {
    const assessmentId = parseAssessmentId(req.params.id);
    const theory = await theoryService.getTheory(assessmentId);

    res.json({ theory });
  } catch (error) {
    next(error);
  }
}

async function saveDraft(req, res, next) {
  try {
    const assessmentId = parseAssessmentId(req.params.id);
    const payload = validateDraftPayload(req.body);
    const draft = await theoryService.saveDraft(assessmentId, payload);

    res.json({ draft });
  } catch (error) {
    next(error);
  }
}

async function publish(req, res, next) {
  try {
    const assessmentId = parseAssessmentId(req.params.id);
    const payload = validatePublishPayload(req.body);
    const result = await theoryService.publish(assessmentId, payload);

    res.json({
      version: result.version,
      createdNewVersion: result.createdNewVersion,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTheory,
  saveDraft,
  publish,
};

