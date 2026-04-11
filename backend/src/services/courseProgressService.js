const courseModel = require("../models/courseModel");

async function startCourse({ courseId, userId }) {
  return courseModel.startCourseProgress(courseId, userId);
}

async function handleModuleAttemptCompletion({ moduleId, userId, attemptId }) {
  return courseModel.markModuleAttemptCompleted({
    moduleId,
    userId,
    attemptId,
  });
}

async function validateFinalAssessmentAccess({ courseId, userId }) {
  const access = await courseModel.canAccessFinalAssessment({ courseId, userId });
  if (!access.allowed) {
    const error = new Error(access.reason || "Итоговая аттестация недоступна");
    error.status = 409;
    error.meta = {
      totalRequiredModules: access.totalRequiredModules || 0,
      passedRequiredModules: access.passedRequiredModules || 0,
    };
    throw error;
  }
  return access;
}

async function handleFinalAttemptCompletion({ courseId, userId, attemptId }) {
  await validateFinalAssessmentAccess({ courseId, userId });
  return courseModel.markFinalAttemptCompleted({
    courseId,
    userId,
    attemptId,
  });
}

module.exports = {
  startCourse,
  handleModuleAttemptCompletion,
  validateFinalAssessmentAccess,
  handleFinalAttemptCompletion,
};
