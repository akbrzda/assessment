const assessmentController = require("./core/assessment/controller");
const theoryController = require("./core/theory/controller");
const adminTheoryController = require("../admin/theory/controller");
const { ensureAssessmentId, ensureAttemptId } = require("./validators");

async function listForUser(req, res, next) {
  try {
    return await assessmentController.listForUser(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getForUser(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    return await assessmentController.getForUser(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getTheory(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    return await theoryController.getTheory(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function completeTheory(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    return await theoryController.completeTheory(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function startAttempt(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    return await assessmentController.startAttempt(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function submitAnswer(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    ensureAttemptId(req.params.attemptId);
    return await assessmentController.submitAnswer(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function submitAnswersBatch(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    ensureAttemptId(req.params.attemptId);
    return await assessmentController.submitAnswersBatch(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function completeAttempt(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    ensureAttemptId(req.params.attemptId);
    return await assessmentController.completeAttempt(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getAttemptResult(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    ensureAttemptId(req.params.attemptId);
    return await assessmentController.getAttemptResultController(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function listManaged(req, res, next) {
  try {
    return await assessmentController.listManaged(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function listTargets(req, res, next) {
  try {
    return await assessmentController.listTargets(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    return await assessmentController.create(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getAdminTheory(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    return await adminTheoryController.getTheory(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function saveAdminTheoryDraft(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    return await adminTheoryController.saveDraft(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function publishAdminTheory(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    return await adminTheoryController.publish(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getDetail(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    return await assessmentController.getDetail(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    return await assessmentController.update(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    ensureAssessmentId(req.params.id);
    return await assessmentController.remove(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserAttemptHistory(req, res, next) {
  try {
    return await assessmentController.getUserAttemptHistory(req, res, next);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listForUser,
  getForUser,
  getTheory,
  completeTheory,
  startAttempt,
  submitAnswer,
  submitAnswersBatch,
  completeAttempt,
  getAttemptResult,
  listManaged,
  listTargets,
  create,
  getAdminTheory,
  saveAdminTheoryDraft,
  publishAdminTheory,
  getDetail,
  update,
  remove,
  getUserAttemptHistory,
};
