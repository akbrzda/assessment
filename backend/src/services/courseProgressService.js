const { pool } = require("../config/database");
const coursesRepo = require("../modules/courses/courses.repository");
const progressRepo = require("../modules/courses/courseProgress.repository");

async function startCourse({ courseId, userId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const course = await coursesRepo.findById(courseId, { connection, forUpdate: true });
    if (!course) {
      const error = new Error("Курс не найден");
      error.status = 404;
      throw error;
    }
    if (course.status !== "published") {
      const error = new Error("Прохождение доступно только для опубликованного курса");
      error.status = 409;
      throw error;
    }

    const sections = await coursesRepo.listSectionsByCourseId(courseId, { connection });
    if (!sections.length) {
      const error = new Error("В курсе нет разделов для прохождения");
      error.status = 409;
      throw error;
    }

    const topicsBySectionId = {};
    for (const section of sections) {
      topicsBySectionId[section.id] = await coursesRepo.listTopicsBySectionId(section.id, { connection });
    }

    const totalRequired = sections.filter((s) => s.isRequired).length;
    await progressRepo.upsertCourseProgressOnStart({ courseId, userId, totalRequiredSectionsCount: totalRequired, connection });

    for (const section of sections) {
      await progressRepo.upsertSectionProgressOnStart(courseId, section.id, userId, connection);
      for (const topic of topicsBySectionId[section.id] || []) {
        await progressRepo.upsertTopicProgressOnStart(topic.id, section.id, courseId, userId, connection);
      }
    }

    const snapshot = coursesRepo.buildCourseSnapshot(course, sections, topicsBySectionId);
    await progressRepo.insertCourseSnapshot(courseId, userId, course.version, JSON.stringify(snapshot), connection);

    await connection.commit();
    return { course, sections };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function handleTopicMaterialViewed({ topicId, userId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const topic = await progressRepo.findTopicWithSection(topicId, { connection, forUpdate: true });
    if (!topic) {
      const error = new Error("Тема не найдена");
      error.status = 404;
      throw error;
    }
    if (!topic.hasMaterial) {
      const error = new Error("У данной темы нет теоретического материала");
      error.status = 422;
      throw error;
    }

    // Без теста — просмотр материала завершает тему
    const completedStatus = !topic.assessmentId ? "completed" : "in_progress";
    await progressRepo.markTopicMaterial({ topicId, sectionId: topic.sectionId, courseId: topic.courseId, userId, completedStatus, connection });

    if (completedStatus === "completed") {
      const aggregate = await progressRepo.getCourseProgressAggregate({ courseId: topic.courseId, userId, connection });
      await progressRepo.syncCourseProgress({ courseId: topic.courseId, userId, aggregate, connection });
    }

    await connection.commit();
    return { topicId, materialViewed: true, topicCompleted: completedStatus === "completed" };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function handleTopicAttemptCompletion({ topicId, userId, attemptId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const result = await progressRepo.getTopicAttemptResult({ topicId, userId, attemptId, connection });
    if (!result) {
      const error = new Error("Результат попытки для темы не найден");
      error.status = 404;
      throw error;
    }

    const status = result.passed ? "completed" : "failed";
    await progressRepo.upsertTopicProgress({
      topicId: result.topicId,
      sectionId: result.sectionId,
      courseId: result.courseId,
      userId,
      status,
      attemptId: result.attemptId,
      scorePercent: result.scorePercent,
      attemptNumber: result.attemptNumber,
      connection,
    });

    const aggregate = await progressRepo.getCourseProgressAggregate({ courseId: result.courseId, userId, connection });
    await progressRepo.syncCourseProgress({ courseId: result.courseId, userId, aggregate, connection });

    await connection.commit();
    return { result, aggregate };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function handleSectionAttemptCompletion({ sectionId, userId, attemptId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const result = await progressRepo.getSectionAttemptResult({ sectionId, userId, attemptId, connection });
    if (!result) {
      const error = new Error("Результат попытки для раздела не найден");
      error.status = 404;
      throw error;
    }

    const status = result.passed ? "passed" : "failed";
    await progressRepo.upsertSectionProgress({
      courseId: result.courseId,
      sectionId: result.sectionId,
      userId,
      status,
      attemptId: result.attemptId,
      scorePercent: result.scorePercent,
      attemptNumber: result.attemptNumber,
      connection,
    });

    const aggregate = await progressRepo.getCourseProgressAggregate({ courseId: result.courseId, userId, connection });
    await progressRepo.syncCourseProgress({ courseId: result.courseId, userId, aggregate, connection });

    await connection.commit();
    return { result, aggregate };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function validateFinalAssessmentAccess({ courseId, userId }) {
  const access = await coursesRepo.canAccessFinalAssessment({ courseId, userId });
  if (!access.allowed) {
    const error = new Error(access.reason || "Итоговая аттестация недоступна");
    error.status = 409;
    error.meta = {
      totalRequiredSections: access.totalRequiredSections || 0,
      passedRequiredSections: access.passedRequiredSections || 0,
    };
    throw error;
  }
  return access;
}

async function handleFinalAttemptCompletion({ courseId, userId, attemptId }) {
  await validateFinalAssessmentAccess({ courseId, userId });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const finalAttempt = await progressRepo.getFinalAttemptResult({ courseId, userId, attemptId, connection });
    if (!finalAttempt) {
      const error = new Error("Результат итоговой аттестации не найден");
      error.status = 404;
      throw error;
    }

    const aggregate = await progressRepo.getCourseProgressAggregate({ courseId, userId, connection });
    await progressRepo.syncCourseProgress({ courseId, userId, aggregate, connection });

    if (finalAttempt.passed) {
      await progressRepo.completeCourseProgress({ courseId, userId, totalSections: aggregate.totalRequiredSections, connection });
    }

    await connection.commit();
    return { finalAttempt, passedCourse: finalAttempt.passed };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  startCourse,
  handleTopicMaterialViewed,
  handleTopicAttemptCompletion,
  handleSectionAttemptCompletion,
  validateFinalAssessmentAccess,
  handleFinalAttemptCompletion,
};
