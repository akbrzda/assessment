const courseProgressService = require("../../../services/courseProgressService");
const coursesRepository = require("./repository");

async function listCourses(userId) {
  return coursesRepository.listPublishedCoursesForUser(userId);
}

async function getCourse(courseId, userId) {
  return coursesRepository.getCourseForUser(courseId, userId);
}

async function startCourse(courseId, userId) {
  await courseProgressService.startCourse({ courseId, userId });
  return coursesRepository.getCourseForUser(courseId, userId);
}

async function getCourseProgress(courseId, userId) {
  const course = await coursesRepository.findCourseById(courseId);
  if (!course || course.status !== "published") {
    const error = new Error("РљСѓСЂСЃ РЅРµ РЅР°Р№РґРµРЅ РёР»Рё РЅРµРґРѕСЃС‚СѓРїРµРЅ");
    error.status = 404;
    throw error;
  }

  const [progress, finalAccess] = await Promise.all([
    coursesRepository.getCourseProgressForUser(courseId, userId),
    coursesRepository.canAccessFinalAssessment({ courseId, userId }),
  ]);

  return {
    progress,
    finalAssessment: {
      available: finalAccess.allowed,
      reason: finalAccess.allowed ? null : finalAccess.reason,
      finalAssessmentId: finalAccess.finalAssessmentId || course.finalAssessmentId,
      passedRequiredModules: finalAccess.passedRequiredModules || 0,
      totalRequiredModules: finalAccess.totalRequiredModules || progress.totalModulesCount || 0,
    },
  };
}

async function completeModuleAttempt({ moduleId, attemptId, userId }) {
  const result = await courseProgressService.handleModuleAttemptCompletion({
    moduleId,
    userId,
    attemptId,
  });

  return {
    module: {
      id: result.moduleAttemptResult.moduleId,
      assessmentId: result.moduleAttemptResult.assessmentId,
      attemptId: result.moduleAttemptResult.attemptId,
      attemptNumber: result.moduleAttemptResult.attemptNumber,
      scorePercent: result.moduleAttemptResult.scorePercent,
      passScorePercent: result.moduleAttemptResult.passScorePercent,
      passed: result.moduleAttemptResult.passed,
    },
    progress: {
      progressPercent: result.aggregate.progressPercent,
      passedRequiredModules: result.aggregate.passedRequiredModules,
      totalRequiredModules: result.aggregate.totalRequiredModules,
    },
  };
}

async function getFinalAssessmentAccess(courseId, userId) {
  const finalAccess = await coursesRepository.canAccessFinalAssessment({
    courseId,
    userId,
  });

  return {
    finalAssessment: {
      available: finalAccess.allowed,
      finalAssessmentId: finalAccess.finalAssessmentId || null,
      reason: finalAccess.allowed ? null : finalAccess.reason,
      passedRequiredModules: finalAccess.passedRequiredModules || 0,
      totalRequiredModules: finalAccess.totalRequiredModules || 0,
    },
  };
}

async function completeFinalAttempt({ courseId, attemptId, userId }) {
  const result = await courseProgressService.handleFinalAttemptCompletion({
    courseId,
    userId,
    attemptId,
  });

  return {
    finalAttempt: {
      attemptId: result.finalAttempt.attemptId,
      attemptNumber: result.finalAttempt.attemptNumber,
      scorePercent: result.finalAttempt.scorePercent,
      passScorePercent: result.finalAttempt.passScorePercent,
      passed: result.finalAttempt.passed,
    },
    course: {
      id: result.finalAttempt.courseId,
      completed: result.passedCourse,
    },
  };
}

module.exports = {
  listCourses,
  getCourse,
  startCourse,
  getCourseProgress,
  completeModuleAttempt,
  getFinalAssessmentAccess,
  completeFinalAttempt,
};

