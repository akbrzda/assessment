const courseProgressService = require("../../../services/courseProgressService");
const coursesRepository = require("./repository");
const eventsRepo = require("../courseEvents.repository");
const { listAssignedCourseIds } = require("../courseAssignments.repository");

async function listCourses(userId, positionId, branchId) {
  return coursesRepository.listPublishedCoursesForUser(userId, positionId, branchId);
}

async function getCourse(courseId, userId, userContext = {}) {
  return coursesRepository.getCourseForUser(courseId, userId, userContext);
}

async function startCourse(courseId, userId, { positionId = null, branchId = null } = {}) {
  // Проверка доступа: курс должен быть назначен пользователю
  const allowedIds = await listAssignedCourseIds(userId, positionId, branchId);
  if (!allowedIds.has(Number(courseId))) {
    const error = new Error("Курс недоступен");
    error.status = 403;
    throw error;
  }
  await courseProgressService.startCourse({ courseId, userId });
  return coursesRepository.getCourseForUser(courseId, userId, { positionId, branchId });
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

async function viewTopicMaterial({ topicId, userId }) {
  return courseProgressService.handleTopicMaterialViewed({ topicId, userId });
}

async function completeTopicAttempt({ topicId, attemptId, userId }) {
  const result = await courseProgressService.handleTopicAttemptCompletion({ topicId, userId, attemptId });
  return {
    topic: {
      id: result.result.topicId,
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

async function completeSectionAttempt({ sectionId, attemptId, userId }) {
  const result = await courseProgressService.handleSectionAttemptCompletion({ sectionId, userId, attemptId });
  return {
    section: {
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

  if (finalAccess.allowed) {
    eventsRepo.insertCourseEvent({ courseId, userId, eventType: "course.final_assessment_opened" });
  }

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
  viewTopicMaterial,
  completeTopicAttempt,
  completeSectionAttempt,
  completeModuleAttempt,
  getFinalAssessmentAccess,
  completeFinalAttempt,
};
