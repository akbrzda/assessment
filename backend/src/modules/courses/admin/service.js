const { pool } = require("../../../config/database");
const coursesRepo = require("../courses.repository");
const mutationsRepo = require("../coursesMutations.repository");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");
const fs = require("fs");
const path = require("path");

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
  if (existing.status === "archived") {
    const error = new Error("Закрытый курс нельзя редактировать.");
    error.status = 409;
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

async function uploadCourseCover(courseId, file, userId, req) {
  if (!file?.filename) {
    const error = new Error("Файл обложки не загружен");
    error.status = 400;
    throw error;
  }

  const existing = await coursesRepo.findById(courseId);
  if (!existing) {
    const error = new Error("Курс не найден");
    error.status = 404;
    throw error;
  }
  if (existing.status === "archived") {
    const error = new Error("Для закрытого курса нельзя менять обложку.");
    error.status = 409;
    throw error;
  }

  const coverUrl = `/uploads/courses/${file.filename}`;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await mutationsRepo.updateCourseFields(courseId, { coverUrl }, userId, connection);
    await connection.commit();

    if (typeof existing.coverUrl === "string" && existing.coverUrl.startsWith("/uploads/courses/")) {
      const previousFilePath = path.join(__dirname, "../../../../../uploads/courses", path.basename(existing.coverUrl));
      if (fs.existsSync(previousFilePath)) {
        fs.unlinkSync(previousFilePath);
      }
    }

    const course = await coursesRepo.findById(courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.cover.uploaded",
      entity: "course",
      entityId: courseId,
      metadata: { title: course?.title || existing.title, coverUrl },
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

async function getCoursePreview(courseId) {
  const course = await coursesRepo.getCourseByIdForAdmin(courseId);
  if (!course) {
    const error = new Error("Курс не найден");
    error.status = 404;
    throw error;
  }

  return {
    course,
    source: "published",
    publication: course.publication || { valid: true, errors: [] },
    warnings: [],
  };
}

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  uploadCourseCover,
  deleteCourse,
  publishCourse,
  archiveCourse,
  getCoursePreview,
};
