const courseProgressService = require("../../../services/courseProgressService");
const coursesRepository = require("./repository");
const eventsRepo = require("../courseEvents.repository");
const { listAssignedCourseIds } = require("../courseAssignments.repository");
const progressRepo = require("../courseProgress.repository");
const { pool } = require("../../../config/database");

const TOPIC_WORDS_PER_MINUTE = 200;
const TOPIC_MIN_READING_SECONDS = 5;

function calculateReadingSeconds(text = "") {
  const words = String(text || "")
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (words === 0) {
    return 0;
  }
  return Math.max(TOPIC_MIN_READING_SECONDS, Math.ceil((words / TOPIC_WORDS_PER_MINUTE) * 60));
}

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
  const progress = await coursesRepository.getCourseProgressForUser(courseId, userId);
  if (progress.status === "closed") {
    const error = new Error("Курс закрыт администратором");
    error.status = 409;
    throw error;
  }
  await courseProgressService.startCourse({ courseId, userId });
  return coursesRepository.getCourseForUser(courseId, userId, { positionId, branchId });
}

async function getCourseProgress(courseId, userId) {
  const course = await coursesRepository.findCourseById(courseId);
  if (!course || course.status !== "published") {
    const error = new Error("Курс не найден или недоступен");
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

async function startTopic({ courseId, topicId, userId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const topic = await progressRepo.findTopicWithSection(topicId, { connection, forUpdate: true });
    if (!topic || topic.courseId !== courseId) {
      const error = new Error("Подтема курса не найдена");
      error.status = 404;
      throw error;
    }
    await assertCourseNotClosed({ courseId, userId, connection });

    const prevCompleted = await progressRepo.isPreviousTopicCompleted(
      { sectionId: topic.sectionId, orderIndex: topic.orderIndex, userId },
      { connection },
    );
    if (!prevCompleted) {
      const error = new Error("Необходимо завершить предыдущую подтему перед началом этой");
      error.status = 409;
      throw error;
    }

    await progressRepo.startTopicProgress({
      topicId,
      sectionId: topic.sectionId,
      courseId,
      userId,
      connection,
    });

    const topicProgress = await progressRepo.getTopicProgressState({ topicId, userId, connection });
    await connection.commit();

    return {
      topic: {
        id: topicId,
        startedAt: topicProgress?.startedAt || null,
        requiredReadingSeconds: calculateReadingSeconds(topic.content || ""),
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function completeTopic({ courseId, topicId, userId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const topic = await progressRepo.findTopicWithSection(topicId, { connection, forUpdate: true });
    if (!topic || topic.courseId !== courseId) {
      const error = new Error("Подтема курса не найдена");
      error.status = 404;
      throw error;
    }
    if (!topic.hasMaterial) {
      const error = new Error("У этой подтемы нет материала для завершения через чтение");
      error.status = 422;
      throw error;
    }
    if (topic.assessmentId) {
      const error = new Error("Для завершения этой подтемы необходимо пройти тест");
      error.status = 409;
      throw error;
    }

    await assertCourseNotClosed({ courseId, userId, connection });
    const prevCompleted = await progressRepo.isPreviousTopicCompleted(
      { sectionId: topic.sectionId, orderIndex: topic.orderIndex, userId },
      { connection },
    );
    if (!prevCompleted) {
      const error = new Error("Необходимо завершить предыдущую подтему перед этой");
      error.status = 409;
      throw error;
    }

    const topicProgress = await progressRepo.getTopicProgressState({ topicId, userId, connection });
    if (!topicProgress?.startedAt) {
      const error = new Error("Сначала запустите подтему");
      error.status = 409;
      throw error;
    }

    const requiredSeconds = calculateReadingSeconds(topic.content || "");
    const startedAtDate = new Date(topicProgress.startedAt);
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtDate.getTime()) / 1000));
    if (requiredSeconds > 0 && elapsedSeconds < requiredSeconds) {
      const remaining = requiredSeconds - elapsedSeconds;
      const error = new Error(`Недостаточно времени чтения. Осталось ${remaining} сек.`);
      error.status = 409;
      throw error;
    }

    await progressRepo.markTopicMaterial({
      topicId,
      sectionId: topic.sectionId,
      courseId,
      userId,
      completedStatus: "completed",
      connection,
      topicOrderIndex: topic.orderIndex,
    });

    const aggregate = await progressRepo.getCourseProgressAggregate({ courseId, userId, connection });
    await progressRepo.syncCourseProgress({ courseId, userId, aggregate, connection });

    await connection.commit();
    eventsRepo.insertCourseEvent({ courseId, userId, eventType: "course.topic_completed", payload: { topicId } });
    return {
      topic: {
        id: topicId,
        completed: true,
        elapsedSeconds,
        requiredSeconds,
      },
      progress: {
        progressPercent: aggregate.progressPercent,
        passedRequiredSections: aggregate.passedRequiredSections,
        totalRequiredSections: aggregate.totalRequiredSections,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
  const progress = await coursesRepository.getCourseProgressForUser(courseId, userId);
  if (progress.status === "closed") {
    return {
      finalAssessment: {
        available: false,
        finalAssessmentId: null,
        reason: "COURSE_CLOSED_BY_ADMIN",
        passedRequiredSections: 0,
        totalRequiredSections: progress.totalSectionsCount || 0,
      },
    };
  }

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
  startTopic,
  completeTopic,
  getCourseProgress,
  viewTopicMaterial,
  completeTopicAttempt,
  completeSectionAttempt,
  completeModuleAttempt,
  getFinalAssessmentAccess,
  completeFinalAttempt,
};
