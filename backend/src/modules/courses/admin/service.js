const { pool } = require("../../../config/database");
const coursesRepo = require("../courses.repository");
const draftsRepo = require("../courseDrafts.repository");
const mutationsRepo = require("../coursesMutations.repository");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");
const fs = require("fs");
const path = require("path");

function normalizeDraftPayload(rawPayload, baseCourse) {
  const payload = rawPayload || {};
  const draftCourse = payload.course || {};
  const draftSections = Array.isArray(payload.sections) ? payload.sections : [];

  return {
    course: {
      title: String(draftCourse.title || baseCourse?.title || "").trim(),
      description: String(draftCourse.description || ""),
      coverUrl: draftCourse.coverUrl || null,
      category: draftCourse.category || null,
      tags: Array.isArray(draftCourse.tags) ? draftCourse.tags.filter(Boolean).slice(0, 20) : [],
      finalAssessmentId: draftCourse.finalAssessmentId || null,
      availabilityMode: draftCourse.availabilityMode || "unlimited",
      availabilityDays: draftCourse.availabilityMode === "relative_days" ? Number(draftCourse.availabilityDays || 0) || null : null,
      availabilityFrom: draftCourse.availabilityMode === "fixed_dates" ? draftCourse.availabilityFrom || null : null,
      availabilityTo: draftCourse.availabilityMode === "fixed_dates" ? draftCourse.availabilityTo || null : null,
    },
    sections: draftSections.map((section, sectionIndex) => ({
      title: String(section?.title || "").trim(),
      description: String(section?.description || ""),
      orderIndex: Number(section?.orderIndex || sectionIndex + 1),
      assessmentId: section?.assessmentId || null,
      isRequired: section?.isRequired !== false,
      estimatedMinutes: section?.estimatedMinutes ? Number(section.estimatedMinutes) : null,
      topics: (Array.isArray(section?.topics) ? section.topics : []).map((topic, topicIndex) => ({
        title: String(topic?.title || "").trim(),
        orderIndex: Number(topic?.orderIndex || topicIndex + 1),
        isRequired: topic?.isRequired !== false,
        hasMaterial: Boolean(topic?.hasMaterial),
        content: topic?.hasMaterial ? String(topic?.content || "") : null,
        assessmentId: topic?.assessmentId || null,
      })),
    })),
  };
}

function getDraftImpactWarnings(currentCourse, draftPayload) {
  const warnings = [];
  if (!currentCourse || currentCourse.status !== "published") {
    return warnings;
  }

  const currentSections = Array.isArray(currentCourse.sections) ? currentCourse.sections : [];
  const draftSections = Array.isArray(draftPayload?.sections) ? draftPayload.sections : [];

  const currentRequiredSections = currentSections.filter((section) => section.isRequired).length;
  const draftRequiredSections = draftSections.filter((section) => section.isRequired !== false).length;
  if (draftRequiredSections > currentRequiredSections) {
    warnings.push("Увеличено количество обязательных тем курса. После публикации потребуется пересчёт прогресса.");
  }

  const currentTopicsCount = currentSections.reduce((sum, section) => sum + ((section.topics || []).length || 0), 0);
  const draftTopicsCount = draftSections.reduce((sum, section) => sum + ((section.topics || []).length || 0), 0);
  if (draftTopicsCount > currentTopicsCount) {
    warnings.push("Добавлены новые подтемы. Пользователи с завершённым курсом могут получить блокировку до прохождения новых шагов.");
  }

  if (draftPayload?.course?.finalAssessmentId && Number(draftPayload.course.finalAssessmentId) !== Number(currentCourse.finalAssessmentId || 0)) {
    warnings.push("Изменена итоговая аттестация курса. Рекомендуется проверить доступность и назначение теста.");
  }

  return warnings;
}

async function validateDraftForPublication(draftPayload, connection) {
  const errors = [];
  const draftCourse = draftPayload?.course || {};
  const draftSections = Array.isArray(draftPayload?.sections) ? draftPayload.sections : [];

  if (!draftCourse.title) {
    errors.push("Укажите название курса");
  }
  if (!draftCourse.finalAssessmentId) {
    errors.push("Для публикации курса необходимо назначить итоговую аттестацию");
  } else {
    const [rows] = await connection.execute("SELECT id FROM assessments WHERE id = ? LIMIT 1", [draftCourse.finalAssessmentId]);
    if (!rows.length) {
      errors.push("Указанная итоговая аттестация курса не найдена");
    }
  }

  if (!draftSections.length) {
    errors.push("Для публикации курса необходим минимум один раздел");
  }

  for (const section of draftSections) {
    if (!section.title) {
      errors.push("Одна из тем курса не содержит название");
      continue;
    }
    if (!section.assessmentId) {
      errors.push(`Тема курса "${section.title}": не назначен проверочный тест темы курса`);
    } else {
      const [rows] = await connection.execute("SELECT id FROM assessments WHERE id = ? LIMIT 1", [section.assessmentId]);
      if (!rows.length) {
        errors.push(`Тема курса "${section.title}": проверочный тест темы курса не найден`);
      }
    }

    const topics = Array.isArray(section.topics) ? section.topics : [];
    if (!topics.length) {
      errors.push(`Тема курса "${section.title}": должна содержать хотя бы одну подтему`);
      continue;
    }

    for (const topic of topics) {
      if (!topic.title) {
        errors.push(`Тема курса "${section.title}": обнаружена подтема без названия`);
        continue;
      }
      if (!topic.hasMaterial && !topic.assessmentId) {
        errors.push(`Тема курса "${section.title}", подтема "${topic.title}": должна содержать материал или тест`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

async function applyDraftPayloadToCourse(courseId, draftPayload, userId, connection) {
  await mutationsRepo.updateCourseFields(
    courseId,
    {
      title: draftPayload.course.title,
      description: draftPayload.course.description,
      coverUrl: draftPayload.course.coverUrl,
      category: draftPayload.course.category,
      tags: draftPayload.course.tags,
      finalAssessmentId: draftPayload.course.finalAssessmentId,
      availabilityMode: draftPayload.course.availabilityMode,
      availabilityDays: draftPayload.course.availabilityDays,
      availabilityFrom: draftPayload.course.availabilityFrom,
      availabilityTo: draftPayload.course.availabilityTo,
    },
    userId,
    connection,
  );

  await connection.execute("DELETE FROM course_sections WHERE course_id = ?", [courseId]);

  const sections = Array.isArray(draftPayload.sections) ? draftPayload.sections : [];
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const sectionId = await mutationsRepo.insertSection(
      courseId,
      {
        title: section.title,
        description: section.description,
        orderIndex: sectionIndex + 1,
        assessmentId: section.assessmentId,
        isRequired: section.isRequired,
        estimatedMinutes: section.estimatedMinutes,
      },
      connection,
    );

    const topics = Array.isArray(section.topics) ? section.topics : [];
    for (let topicIndex = 0; topicIndex < topics.length; topicIndex += 1) {
      const topic = topics[topicIndex];
      await mutationsRepo.insertTopic(
        sectionId,
        courseId,
        {
          title: topic.title,
          orderIndex: topicIndex + 1,
          isRequired: topic.isRequired,
          hasMaterial: topic.hasMaterial,
          content: topic.content,
          assessmentId: topic.assessmentId,
        },
        connection,
      );
    }
  }
}

async function scheduleCompletedLockedRecalculation(courseId) {
  setImmediate(() => {
    // TODO: Sprint 6 — подключить фоновый job для полноценного completed_locked пересчёта.
    // На Sprint 5 оставляем явный хук, чтобы публикация черновика не теряла событие.
    console.info(`[courses] publish-draft: запланирован пересчёт completed_locked для курса ${courseId}`);
  });
}

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
  if (existing.status === "published") {
    const error = new Error("Опубликованный курс нельзя редактировать напрямую. Используйте черновик изменений.");
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
  if (existing.status === "published") {
    const error = new Error("Для опубликованного курса обложку нужно менять через черновик изменений.");
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

  const draft = await draftsRepo.findByCourseId(courseId);
  const previewCourse = draft?.payload ? { ...course, ...draft.payload.course, sections: draft.payload.sections || [] } : course;
  const warnings = getDraftImpactWarnings(course, draft?.payload);

  return {
    course: previewCourse,
    source: draft ? "draft" : "published",
    publication: course.publication || { valid: true, errors: [] },
    warnings,
    draft: draft
      ? {
          id: draft.id,
          versionLabel: draft.versionLabel,
          updatedAt: draft.updatedAt,
          updatedBy: draft.updatedBy,
        }
      : null,
  };
}

async function upsertCourseDraft(courseId, payload, versionLabel, userId, req) {
  const course = await coursesRepo.getCourseByIdForAdmin(courseId);
  if (!course) {
    const error = new Error("Курс не найден");
    error.status = 404;
    throw error;
  }

  const basePayload = {
    course: {
      title: course.title,
      description: course.description,
      coverUrl: course.coverUrl,
      category: course.category,
      tags: course.tags || [],
      finalAssessmentId: course.finalAssessmentId,
      availabilityMode: course.availabilityMode,
      availabilityDays: course.availabilityDays,
      availabilityFrom: course.availabilityFrom,
      availabilityTo: course.availabilityTo,
    },
    sections: (course.sections || []).map((section) => ({
      title: section.title,
      description: section.description,
      orderIndex: section.orderIndex,
      assessmentId: section.assessmentId,
      isRequired: section.isRequired,
      estimatedMinutes: section.estimatedMinutes,
      topics: (section.topics || []).map((topic) => ({
        title: topic.title,
        orderIndex: topic.orderIndex,
        isRequired: topic.isRequired,
        hasMaterial: topic.hasMaterial,
        content: topic.content,
        assessmentId: topic.assessmentId,
      })),
    })),
  };

  const normalizedPayload = normalizeDraftPayload(payload || basePayload, course);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await draftsRepo.upsertByCourseId(courseId, normalizedPayload, versionLabel, userId, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const draft = await draftsRepo.findByCourseId(courseId);
  await logAndSend({
    req,
    actor: buildActorFromRequest(req),
    scope: "admin_panel",
    action: "course.draft.saved",
    entity: "course",
    entityId: courseId,
    metadata: { hasPayload: Boolean(draft?.payload), versionLabel: draft?.versionLabel || null },
  });

  return draft;
}

async function getCourseDraft(courseId) {
  const course = await coursesRepo.findById(courseId);
  if (!course) {
    const error = new Error("Курс не найден");
    error.status = 404;
    throw error;
  }

  return draftsRepo.findByCourseId(courseId);
}

async function deleteCourseDraft(courseId, req) {
  const course = await coursesRepo.findById(courseId);
  if (!course) {
    const error = new Error("Курс не найден");
    error.status = 404;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await draftsRepo.deleteByCourseId(courseId, connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await logAndSend({
    req,
    actor: buildActorFromRequest(req),
    scope: "admin_panel",
    action: "course.draft.deleted",
    entity: "course",
    entityId: courseId,
    metadata: { title: course.title },
  });
}

async function publishCourseDraft(courseId, userId, req) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const currentCourse = await coursesRepo.findById(courseId, { connection, forUpdate: true });
    if (!currentCourse) {
      const error = new Error("Курс не найден");
      error.status = 404;
      throw error;
    }
    if (currentCourse.status === "archived") {
      const error = new Error("Нельзя публиковать черновик закрытого курса");
      error.status = 409;
      throw error;
    }

    const draft = await draftsRepo.findByCourseId(courseId, { connection, forUpdate: true });
    if (!draft || !draft.payload) {
      const error = new Error("Черновик курса не найден");
      error.status = 404;
      throw error;
    }

    const normalizedPayload = normalizeDraftPayload(draft.payload, currentCourse);
    const validation = await validateDraftForPublication(normalizedPayload, connection);
    if (!validation.valid) {
      const error = new Error("Курс не готов к публикации");
      error.status = 422;
      error.meta = { validationErrors: validation.errors };
      throw error;
    }
    await applyDraftPayloadToCourse(courseId, normalizedPayload, userId, connection);

    const nextVersion = Number(currentCourse.version || 0) + 1;
    if (currentCourse.status === "draft") {
      await mutationsRepo.publishCourseById(courseId, nextVersion, userId, connection);
    } else {
      await connection.execute(
        `UPDATE courses
            SET status = 'published',
                version = ?,
                published_at = UTC_TIMESTAMP(),
                updated_by = ?,
                updated_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [nextVersion, userId || null, courseId],
      );
    }

    await draftsRepo.deleteByCourseId(courseId, connection);
    await connection.commit();

    const course = await coursesRepo.getCourseByIdForAdmin(courseId);
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      scope: "admin_panel",
      action: "course.draft.published",
      entity: "course",
      entityId: courseId,
      metadata: { title: course?.title || currentCourse.title, version: course?.version || nextVersion },
    });
    await scheduleCompletedLockedRecalculation(courseId);
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
  uploadCourseCover,
  deleteCourse,
  publishCourse,
  archiveCourse,
  getCoursePreview,
  upsertCourseDraft,
  getCourseDraft,
  deleteCourseDraft,
  publishCourseDraft,
};
