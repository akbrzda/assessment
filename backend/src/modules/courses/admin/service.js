const { pool } = require("../../../config/database");
const coursesRepo = require("../courses.repository");
const mutationsRepo = require("../coursesMutations.repository");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");

// - урс -

async function listCourses({ status, search } = {}) {
  return coursesRepo.listCoursesForAdmin({ status, search });
}

async function getCourse(courseId) {
  const course = await coursesRepo.getCourseByIdForAdmin(courseId);
  if (!course) {
    const error = new Error("урс не найден");
    error.status = 404;
    throw error;
  }
  return course;
}

async function createCourse(payload, userId, req) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const insertId = await mutationsRepo.insertCourse({ ...payload, userId }, connection);
    await connection.commit();

    const course = await coursesRepo.findById(insertId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.created",
      entity: "course",
      entityId: course.id,
      metadata: { title: course.title, status: course.status },
    });
    return course;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateCourse(courseId, payload, userId, req) {
  const existing = await coursesRepo.findById(courseId);
  if (!existing) {
    const error = new Error("урс не найден");
    error.status = 404;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await mutationsRepo.updateCourseFields(courseId, payload, userId, connection);
    await connection.commit();

    const course = await coursesRepo.findById(courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.updated",
      entity: "course",
      entityId: courseId,
      metadata: { title: course.title, status: course.status, previousStatus: existing.status },
    });
    return course;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteCourse(courseId, req) {
  const existing = await coursesRepo.findById(courseId);
  if (!existing) {
    const error = new Error("урс не найден");
    error.status = 404;
    throw error;
  }
  if (existing.status === "published") {
    const error = new Error("ельзя удалить опубликованный курс. Сначала переведите его в архив.");
    error.status = 409;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const hasProgress = await mutationsRepo.checkCourseHasProgress(courseId, connection);
    if (hasProgress) {
      const error = new Error("ельзя удалить курс, по которому уже есть прогресс пользователей");
      error.status = 409;
      throw error;
    }
    await mutationsRepo.deleteCourseById(courseId, connection);
    await connection.commit();

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.deleted",
      entity: "course",
      entityId: courseId,
      metadata: { title: existing.title },
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function publishCourse(courseId, userId, req) {
  const integrity = await coursesRepo.validatePublicationIntegrity(courseId);
  if (!integrity.valid) {
    const error = new Error("урс не готов к публикации");
    error.status = 422;
    error.meta = { validationErrors: integrity.errors };
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const current = await coursesRepo.findById(courseId, { connection, forUpdate: true });
    await mutationsRepo.publishCourseById(courseId, Number(current.version || 0) + 1, userId, connection);
    await connection.commit();

    const course = await coursesRepo.findById(courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.published",
      entity: "course",
      entityId: courseId,
      metadata: { title: course.title, version: course.version },
    });
    return course;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function archiveCourse(courseId, userId, req) {
  const existing = await coursesRepo.findById(courseId);
  if (!existing) {
    const error = new Error("урс не найден");
    error.status = 404;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await mutationsRepo.archiveCourseById(courseId, userId, connection);
    await connection.commit();

    const course = await coursesRepo.findById(courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.archived",
      entity: "course",
      entityId: courseId,
      metadata: { title: existing.title },
    });
    return course;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  archiveCourse,
};
