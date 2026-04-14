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
      passedRequiredSections: finalAccess.passedRequiredSections || 0,
      totalRequiredSections: finalAccess.totalRequiredSections || 0,
    },
  };
}

async function completeModuleAttempt({ moduleId, attemptId, userId }) {
  const result = await courseProgressService.handleSectionAttemptCompletion({
    sectionId: moduleId,
    userId,
    attemptId,
  });

  return {
    module: {
      id: result.result.sectionId,
      assessmentId: result.result.assessmentId,
      attemptId: result.result.attemptId,
      attemptNumber: result.result.attemptNumber,
      scorePercent: result.result.scorePercent,
      passScorePercent: result.result.passScorePercent,
      passed: result.result.passed,
    },
    progress: {
      progressPercent: result.aggregate.progressPercent,
      passedRequiredSections: result.aggregate.passedRequiredSections,
      totalRequiredSections: result.aggregate.totalRequiredSections,
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
      passedRequiredSections: finalAccess.passedRequiredSections || 0,
      totalRequiredSections: finalAccess.totalRequiredSections || 0,
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
