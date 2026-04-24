const { pool } = require("../../../config/database");
const coursesRepo = require("../courses.repository");
const mutationsRepo = require("../coursesMutations.repository");
const progressRepo = require("../courseProgress.repository");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");

function ensureCourseEditable(courseStatus) {
  if (courseStatus === "archived") {
    const error = new Error("Закрытый курс нельзя редактировать.");
    error.status = 409;
    throw error;
  }
}

async function recalculateProgressIfPublished(courseId, isPublished, connection) {
  if (!isPublished) {
    return;
  }
  await progressRepo.recalculateCourseProgressForAllUsers({ courseId, connection });
}

// ─── Разделы ────────────────────────────────────────────────────────────────

async function createSection(courseId, payload, userId, req) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const course = await coursesRepo.findById(courseId, { connection, forUpdate: true });
    if (!course) {
      const error = new Error("Курс не найден");
      error.status = 404;
      throw error;
    }
    ensureCourseEditable(course.status);
    const orderIndex = payload.orderIndex ?? (await mutationsRepo.getNextSectionOrder(courseId, connection));
    if (payload.orderIndex) await mutationsRepo.shiftSectionsUp(courseId, orderIndex, connection);
    const sectionId = await mutationsRepo.insertSection(courseId, { ...payload, orderIndex }, connection);
    await mutationsRepo.touchCourse(courseId, userId, course.status === "published", connection);
    await recalculateProgressIfPublished(courseId, course.status === "published", connection);
    await connection.commit();

    const sections = await coursesRepo.listSectionsByCourseId(courseId);
    const section = sections.find((s) => s.id === sectionId) || null;
    const updatedCourse = await coursesRepo.getCourseByIdForAdmin(courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.section.created",
      entity: "course_section",
      entityId: sectionId,
      metadata: { courseId, title: section?.title },
    });
    return { section, course: updatedCourse };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateSection(sectionId, payload, userId, req) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const section = await coursesRepo.findSectionById(sectionId, { connection, forUpdate: true });
    if (!section) {
      const error = new Error("Раздел не найден");
      error.status = 404;
      throw error;
    }
    ensureCourseEditable(section.courseStatus);
    if (payload.orderIndex !== undefined && Number(payload.orderIndex) !== section.orderIndex) {
      const target = Number(payload.orderIndex);
      if (target > section.orderIndex) {
        await mutationsRepo.shiftSectionsDown(section.courseId, section.orderIndex, target, connection);
      } else {
        await mutationsRepo.shiftSectionsUp2(section.courseId, target, section.orderIndex, connection);
      }
    }
    await mutationsRepo.updateSectionFields(sectionId, payload, connection);
    await mutationsRepo.touchCourse(section.courseId, userId, section.courseStatus === "published", connection);
    await recalculateProgressIfPublished(section.courseId, section.courseStatus === "published", connection);
    await connection.commit();

    const sections = await coursesRepo.listSectionsByCourseId(section.courseId);
    const updatedSection = sections.find((s) => s.id === Number(sectionId)) || null;
    const updatedCourse = await coursesRepo.getCourseByIdForAdmin(section.courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.section.updated",
      entity: "course_section",
      entityId: sectionId,
      metadata: { courseId: section.courseId, title: updatedSection?.title },
    });
    return { section: updatedSection, course: updatedCourse };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteSection(sectionId, userId, req) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const section = await coursesRepo.findSectionById(sectionId, { connection, forUpdate: true });
    if (!section) {
      const error = new Error("Раздел не найден");
      error.status = 404;
      throw error;
    }
    ensureCourseEditable(section.courseStatus);
    await mutationsRepo.deleteSectionById(sectionId, connection);
    await mutationsRepo.compactSectionOrder(section.courseId, section.orderIndex, connection);
    await mutationsRepo.touchCourse(section.courseId, userId, section.courseStatus === "published", connection);
    await recalculateProgressIfPublished(section.courseId, section.courseStatus === "published", connection);
    await connection.commit();

    const updatedCourse = await coursesRepo.getCourseByIdForAdmin(section.courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.section.deleted",
      entity: "course_section",
      entityId: sectionId,
      metadata: { courseId: section.courseId },
    });
    return { course: updatedCourse };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ─── Темы ───────────────────────────────────────────────────────────────────

async function createTopic(sectionId, payload, userId, req) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const section = await coursesRepo.findSectionById(sectionId, { connection, forUpdate: true });
    if (!section) {
      const error = new Error("Раздел не найден");
      error.status = 404;
      throw error;
    }
    ensureCourseEditable(section.courseStatus);
    const orderIndex = payload.orderIndex ?? (await mutationsRepo.getNextTopicOrder(sectionId, connection));
    if (payload.orderIndex) await mutationsRepo.shiftTopicsUp(sectionId, orderIndex, connection);
    const topicId = await mutationsRepo.insertTopic(sectionId, section.courseId, { ...payload, orderIndex }, connection);
    await mutationsRepo.touchCourse(section.courseId, userId, section.courseStatus === "published", connection);
    await recalculateProgressIfPublished(section.courseId, section.courseStatus === "published", connection);
    await connection.commit();

    const topics = await coursesRepo.listTopicsBySectionId(sectionId);
    const topic = topics.find((t) => t.id === topicId) || null;
    const updatedCourse = await coursesRepo.getCourseByIdForAdmin(section.courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.topic.created",
      entity: "course_topic",
      entityId: topicId,
      metadata: { sectionId, courseId: section.courseId, title: topic?.title },
    });
    return { topic, course: updatedCourse };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function reorderSections(courseId, sectionIds, userId, req) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const course = await coursesRepo.findById(courseId, { connection, forUpdate: true });
    if (!course) {
      const error = new Error("Курс не найден");
      error.status = 404;
      throw error;
    }
    ensureCourseEditable(course.status);

    const sections = await coursesRepo.listSectionsByCourseId(courseId, { connection, forUpdate: true });
    const dbIds = sections.map((section) => Number(section.id)).sort((a, b) => a - b);
    const requestedIds = sectionIds.map(Number).sort((a, b) => a - b);
    if (dbIds.length !== requestedIds.length || dbIds.some((id, index) => id !== requestedIds[index])) {
      const error = new Error("Передан некорректный состав тем курса для сортировки");
      error.status = 422;
      throw error;
    }

    await mutationsRepo.reorderSections(courseId, sectionIds, connection);
    await mutationsRepo.touchCourse(courseId, userId, course.status === "published", connection);
    await connection.commit();

    const updatedCourse = await coursesRepo.getCourseByIdForAdmin(courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.section.reordered",
      entity: "course",
      entityId: courseId,
      metadata: { courseId },
    });
    return { course: updatedCourse };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function reorderTopics(courseId, sectionId, topicIds, userId, req) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const section = await coursesRepo.findSectionById(sectionId, { connection, forUpdate: true });
    if (!section || section.courseId !== Number(courseId)) {
      const error = new Error("Тема курса не найдена");
      error.status = 404;
      throw error;
    }
    ensureCourseEditable(section.courseStatus);

    const topics = await coursesRepo.listTopicsBySectionId(sectionId, { connection });
    const dbIds = topics.map((topic) => Number(topic.id)).sort((a, b) => a - b);
    const requestedIds = topicIds.map(Number).sort((a, b) => a - b);
    if (dbIds.length !== requestedIds.length || dbIds.some((id, index) => id !== requestedIds[index])) {
      const error = new Error("Передан некорректный состав подтем для сортировки");
      error.status = 422;
      throw error;
    }

    await mutationsRepo.reorderTopics(sectionId, topicIds, connection);
    await mutationsRepo.touchCourse(section.courseId, userId, section.courseStatus === "published", connection);
    await connection.commit();

    const updatedCourse = await coursesRepo.getCourseByIdForAdmin(section.courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.topic.reordered",
      entity: "course_section",
      entityId: sectionId,
      metadata: { sectionId, courseId: section.courseId },
    });
    return { course: updatedCourse };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateTopic(topicId, payload, userId, req) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const topic = await coursesRepo.findTopicById(topicId, { connection, forUpdate: true });
    if (!topic) {
      const error = new Error("Тема не найдена");
      error.status = 404;
      throw error;
    }
    ensureCourseEditable(topic.courseStatus);
    const resolvedHasMaterial = payload.hasMaterial !== undefined ? payload.hasMaterial : topic.hasMaterial;
    const resolvedAssessmentId = payload.assessmentId !== undefined ? payload.assessmentId || null : topic.assessmentId;
    if (!resolvedHasMaterial && !resolvedAssessmentId) {
      const error = new Error("Тема должна содержать материал или тест");
      error.status = 422;
      throw error;
    }
    if (payload.orderIndex !== undefined && Number(payload.orderIndex) !== topic.orderIndex) {
      const target = Number(payload.orderIndex);
      if (target > topic.orderIndex) {
        await mutationsRepo.shiftTopicsDown(topic.sectionId, topic.orderIndex, target, connection);
      } else {
        await mutationsRepo.shiftTopicsUp2(topic.sectionId, target, topic.orderIndex, connection);
      }
    }
    await mutationsRepo.updateTopicFields(topicId, payload, connection);
    await mutationsRepo.touchCourse(topic.courseId, userId, topic.courseStatus === "published", connection);
    await recalculateProgressIfPublished(topic.courseId, topic.courseStatus === "published", connection);
    await connection.commit();

    const topics = await coursesRepo.listTopicsBySectionId(topic.sectionId);
    const updatedTopic = topics.find((t) => t.id === Number(topicId)) || null;
    const updatedCourse = await coursesRepo.getCourseByIdForAdmin(topic.courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.topic.updated",
      entity: "course_topic",
      entityId: topicId,
      metadata: { sectionId: topic.sectionId, courseId: topic.courseId, title: updatedTopic?.title },
    });
    return { topic: updatedTopic, course: updatedCourse };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteTopic(topicId, userId, req) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const topic = await coursesRepo.findTopicById(topicId, { connection, forUpdate: true });
    if (!topic) {
      const error = new Error("Тема не найдена");
      error.status = 404;
      throw error;
    }
    ensureCourseEditable(topic.courseStatus);
    await mutationsRepo.deleteTopicById(topicId, connection);
    await mutationsRepo.compactTopicOrder(topic.sectionId, topic.orderIndex, connection);
    await mutationsRepo.touchCourse(topic.courseId, userId, topic.courseStatus === "published", connection);
    await recalculateProgressIfPublished(topic.courseId, topic.courseStatus === "published", connection);
    await connection.commit();

    const updatedCourse = await coursesRepo.getCourseByIdForAdmin(topic.courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.topic.deleted",
      entity: "course_topic",
      entityId: topicId,
      metadata: { sectionId: topic.sectionId, courseId: topic.courseId },
    });
    return { course: updatedCourse };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createSection,
  updateSection,
  deleteSection,
  createTopic,
  reorderSections,
  reorderTopics,
  updateTopic,
  deleteTopic,
};
