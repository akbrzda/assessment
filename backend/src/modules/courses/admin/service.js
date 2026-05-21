const { pool } = require("../../../config/database");
const coursesRepo = require("../courses.repository");
const mutationsRepo = require("../coursesMutations.repository");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");
const fs = require("fs");
const path = require("path");
const notificationService = require("../../../services/notifications/notificationService");
const logger = require("../../../utils/logger");
const cacheService = require("../../../services/cacheService");

// - урс -

async function listCourses({ status, search } = {}) {
  const cacheKey = `courses:admin:list:${status || "all"}:${search || ""}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const courses = await coursesRepo.listCoursesForAdmin({ status, search });
  await cacheService.set(cacheKey, courses, 120);
  return courses;
}

async function getCourse(courseId) {
  const cacheKey = `courses:admin:details:${courseId}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const course = await coursesRepo.getCourseByIdForAdmin(courseId);
  if (!course) {
    const error = new Error("урс не найден");
    error.status = 404;
    throw error;
  }
  await cacheService.set(cacheKey, course, 120);
  return course;
}

async function invalidateCourseAdminCache(courseId) {
  await cacheService.invalidate(/^courses:admin:list:/);
  if (courseId) {
    await cacheService.delete(`courses:admin:details:${courseId}`);
  }
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
    await invalidateCourseAdminCache(course.id);
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
    await invalidateCourseAdminCache(courseId);
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
    await invalidateCourseAdminCache(courseId);
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
    await invalidateCourseAdminCache(courseId);
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
    await invalidateCourseAdminCache(courseId);

    // Создаём уведомления для всех employee без прогресса по курсу
    setImmediate(() =>
      _scheduleNewCourseNotifications(courseId, course.title).catch((err) => {
        logger.error("publishCourse: ошибка создания уведомлений courseId=%s: %s", courseId, err.message);
      }),
    );

    return course;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Создаёт уведомления типа new_course для сотрудников без прогресса по курсу.
 * Ограничение: не более 3 уведомлений о новых курсах в день на пользователя.
 */
async function _scheduleNewCourseNotifications(courseId, courseTitle) {
  // Выбираем employees без прогресса по курсу и с включёнными уведомлениями
  const [users] = await pool.execute(
    `SELECT u.id, u.first_name
     FROM users u
     WHERE u.role = 'employee'
       AND u.notifications_enabled = 1
       AND u.telegram_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM course_user_progress cup
         WHERE cup.course_id = ? AND cup.user_id = u.id
       )`,
    [courseId],
  );

  if (!users.length) {
    logger.debug("_scheduleNewCourseNotifications: нет получателей для courseId=%s", courseId);
    return;
  }

  let created = 0;
  for (const user of users) {
    // Ограничение: не более 3 уведомлений о новых курсах в день
    const todayCount = await notificationService.countNewCourseTodayForUser(user.id);
    if (todayCount >= 3) {
      continue;
    }

    await notificationService.create({
      userId: user.id,
      type: "new_course",
      entityType: "course",
      entityId: courseId,
      payload: {
        firstName: user.first_name,
        courseTitle,
        courseId,
      },
    });
    created++;
  }

  logger.info("_scheduleNewCourseNotifications: создано %d уведомлений для courseId=%s", created, courseId);
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
    await invalidateCourseAdminCache(courseId);
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
