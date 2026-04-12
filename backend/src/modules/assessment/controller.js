const assessmentController = require("../../controllers/assessmentController");
const theoryController = require("../../controllers/theoryController");
const adminTheoryController = require("../admin/assessments/theory/assessments-theory.controller");

module.exports = {
  listForUser: assessmentController.listForUser,
  getForUser: assessmentController.getForUser,
  getTheory: theoryController.getTheory,
  completeTheory: theoryController.completeTheory,
  startAttempt: assessmentController.startAttempt,
  submitAnswer: assessmentController.submitAnswer,
  submitAnswersBatch: assessmentController.submitAnswersBatch,
  completeAttempt: assessmentController.completeAttempt,
  getAttemptResult: assessmentController.getAttemptResultController,
  listManaged: assessmentController.listManaged,
  listTargets: assessmentController.listTargets,
  create: assessmentController.create,
  getAdminTheory: adminTheoryController.getTheory,
  saveAdminTheoryDraft: adminTheoryController.saveDraft,
  publishAdminTheory: adminTheoryController.publish,
  getDetail: assessmentController.getDetail,
  update: assessmentController.update,
  remove: assessmentController.remove,
};
