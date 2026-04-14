const { pool } = require("../config/database");

function toIsoUtc(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function mapCourseRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    title: row.title,
    description: row.description || "",
    status: row.status,
    version: Number(row.version || 0),
    finalAssessmentId: row.final_assessment_id ? Number(row.final_assessment_id) : null,
    createdBy: row.created_by ? Number(row.created_by) : null,
    updatedBy: row.updated_by ? Number(row.updated_by) : null,
    publishedAt: toIsoUtc(row.published_at),
    archivedAt: toIsoUtc(row.archived_at),
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
  };
}

function mapSectionRow(row) {
  return {
    id: Number(row.id),
    courseId: Number(row.course_id),
    title: row.title,
    description: row.description || "",
    orderIndex: Number(row.order_index),
    assessmentId: row.assessment_id ? Number(row.assessment_id) : null,
    isRequired: Boolean(row.is_required),
    estimatedMinutes: row.estimated_minutes ? Number(row.estimated_minutes) : null,
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
  };
}

function mapTopicRow(row) {
  return {
    id: Number(row.id),
    sectionId: Number(row.section_id),
    courseId: Number(row.course_id),
    title: row.title,
    orderIndex: Number(row.order_index),
    hasMaterial: Boolean(row.has_material),
    content: row.content || null,
    assessmentId: row.assessment_id ? Number(row.assessment_id) : null,
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
  };
}

async function findById(courseId, options = {}) {
  const { connection } = options;
  const executor = connection || pool;
  const lockClause = options.forUpdate ? " FOR UPDATE" : "";

  const [rows] = await executor.execute(
    `SELECT id, title, description, status, version, final_assessment_id, created_by, updated_by, published_at, archived_at, created_at, updated_at
       FROM courses
      WHERE id = ?${lockClause}`,
    [courseId],
  );

  return mapCourseRow(rows[0]);
}

async function listSectionsByCourseId(courseId, options = {}) {
  const { connection } = options;
  const executor = connection || pool;
  const lockClause = options.forUpdate ? " FOR UPDATE" : "";

  const [rows] = await executor.execute(
    `SELECT id, course_id, title, description, order_index, assessment_id, is_required, estimated_minutes, created_at, updated_at
       FROM course_sections
      WHERE course_id = ?
      ORDER BY order_index ASC${lockClause}`,
    [courseId],
  );

  return rows.map(mapSectionRow);
}

async function listTopicsBySectionId(sectionId, options = {}) {
  const { connection } = options;
  const executor = connection || pool;

  const [rows] = await executor.execute(
    `SELECT id, section_id, course_id, title, order_index, has_material, content, assessment_id, created_at, updated_at
       FROM course_topics
      WHERE section_id = ?
      ORDER BY order_index ASC`,
    [sectionId],
  );

  return rows.map(mapTopicRow);
}

async function listTopicsByCourseId(courseId, options = {}) {
  const { connection } = options;
  const executor = connection || pool;

  const [rows] = await executor.execute(
    `SELECT id, section_id, course_id, title, order_index, has_material, content, assessment_id, created_at, updated_at
       FROM course_topics
      WHERE course_id = ?
      ORDER BY section_id ASC, order_index ASC`,
    [courseId],
  );

  return rows.map(mapTopicRow);
}

async function validatePublicationIntegrity(courseId, options = {}) {
  const { connection } = options;
  const executor = connection || pool;

  const course = await findById(courseId, { connection });
  if (!course) {
    return {
      valid: false,
      errors: ["Курс не найден"],
      course: null,
      sections: [],
    };
  }

  const sections = await listSectionsByCourseId(courseId, { connection });
  const errors = [];

  // Итоговая аттестация опциональна — проверяем только если указана
  if (course.finalAssessmentId) {
    const [finalAssessmentRows] = await executor.execute("SELECT id FROM assessments WHERE id = ? LIMIT 1", [course.finalAssessmentId]);
    if (!finalAssessmentRows.length) {
      errors.push("Указанная итоговая аттестация курса не найдена");
    }
  }

  if (!sections.length) {
    errors.push("Для публикации курса необходим минимум один раздел");
  }

  for (const section of sections) {
    if (!section.assessmentId) {
      errors.push(`Раздел "${section.title}": не назначен тест раздела`);
      continue;
    }

    const [assessmentRows] = await executor.execute("SELECT id FROM assessments WHERE id = ? LIMIT 1", [section.assessmentId]);
    if (!assessmentRows.length) {
      errors.push(`Раздел "${section.title}": тест раздела не найден`);
      continue;
    }

    const topics = await listTopicsBySectionId(section.id, { connection });
    if (!topics.length) {
      errors.push(`Раздел "${section.title}": должна быть хотя бы одна тема`);
      continue;
    }

    for (const topic of topics) {
      if (!topic.hasMaterial && !topic.assessmentId) {
        errors.push(`Раздел "${section.title}", тема "${topic.title}": должна содержать материал или тест`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    course,
    sections,
  };
}

async function publishCourse(courseId, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const integrity = await validatePublicationIntegrity(courseId, { connection });
    if (!integrity.valid) {
      const error = new Error(integrity.errors.join(", "));
      error.status = 422;
      throw error;
    }

    const course = await findById(courseId, { connection, forUpdate: true });
    const targetVersion = Number(course.version || 0) + 1;

    await connection.execute(
      `UPDATE courses
          SET status = 'published',
              version = ?,
              published_at = UTC_TIMESTAMP(),
              archived_at = NULL,
              updated_by = ?,
              updated_at = UTC_TIMESTAMP()
        WHERE id = ?`,
      [targetVersion, userId || null, courseId],
    );

    await connection.commit();
    return findById(courseId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function archiveCourse(courseId, userId) {
  const [result] = await pool.execute(
    `UPDATE courses
        SET status = 'archived',
            archived_at = UTC_TIMESTAMP(),
            updated_by = ?,
            updated_at = UTC_TIMESTAMP()
      WHERE id = ?`,
    [userId || null, courseId],
  );

  return result.affectedRows > 0;
}

function buildCourseSnapshot(course, sections, topicsBySectionId) {
  return {
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      version: course.version,
      finalAssessmentId: course.finalAssessmentId,
    },
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      orderIndex: section.orderIndex,
      assessmentId: section.assessmentId,
      isRequired: section.isRequired,
      estimatedMinutes: section.estimatedMinutes,
      topics: (topicsBySectionId[section.id] || []).map((topic) => ({
        id: topic.id,
        title: topic.title,
        orderIndex: topic.orderIndex,
        hasMaterial: topic.hasMaterial,
        assessmentId: topic.assessmentId,
      })),
    })),
  };
}

async function listPublishedCoursesForUser(userId) {
  const [rows] = await pool.execute(
    `SELECT
       c.id,
       c.title,
       c.description,
       c.status,
       c.version,
       c.final_assessment_id,
       c.created_by,
       c.updated_by,
       c.published_at,
       c.archived_at,
       c.created_at,
       c.updated_at,
       cup.status AS user_status,
       cup.progress_percent,
       cup.completed_modules_count,
       cup.total_modules_count,
       cup.started_at AS user_started_at,
       cup.completed_at AS user_completed_at,
       cup.last_activity_at AS user_last_activity_at,
       (
         SELECT COUNT(*)
         FROM course_sections cs
         WHERE cs.course_id = c.id
       ) AS sections_count,
       (
         SELECT COUNT(*)
         FROM course_sections cs
         WHERE cs.course_id = c.id
           AND cs.is_required = 1
       ) AS required_sections_count
     FROM courses c
     LEFT JOIN course_user_progress cup
       ON cup.course_id = c.id
      AND cup.user_id = ?
     WHERE c.status = 'published'
     ORDER BY c.published_at DESC, c.id DESC`,
    [userId],
  );

  return rows.map((row) => {
    const course = mapCourseRow(row);
    return {
      ...course,
      sectionsCount: Number(row.sections_count || 0),
      requiredSectionsCount: Number(row.required_sections_count || 0),
      progress: {
        status: row.user_status || "not_started",
        progressPercent: row.progress_percent != null ? Number(row.progress_percent) : 0,
        completedSectionsCount: row.completed_modules_count != null ? Number(row.completed_modules_count) : 0,
        totalSectionsCount: row.total_modules_count != null ? Number(row.total_modules_count) : Number(row.required_sections_count || 0),
        startedAt: toIsoUtc(row.user_started_at),
        completedAt: toIsoUtc(row.user_completed_at),
        lastActivityAt: toIsoUtc(row.user_last_activity_at),
      },
    };
  });
}

async function getCourseSnapshot(courseId, userId) {
  const [rows] = await pool.execute(
    `SELECT course_version, snapshot_json, created_at
       FROM course_user_snapshots
      WHERE course_id = ? AND user_id = ?
      LIMIT 1`,
    [courseId, userId],
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  let parsedSnapshot = null;
  try {
    parsedSnapshot = typeof row.snapshot_json === "string" ? JSON.parse(row.snapshot_json) : row.snapshot_json;
  } catch (error) {
    parsedSnapshot = null;
  }

  return {
    courseVersion: Number(row.course_version || 0),
    snapshot: parsedSnapshot,
    createdAt: toIsoUtc(row.created_at),
  };
}

async function getCourseForUser(courseId, userId) {
  const [courseRows] = await pool.execute(
    `SELECT
       c.id,
       c.title,
       c.description,
       c.status,
       c.version,
       c.final_assessment_id,
       c.created_by,
       c.updated_by,
       c.published_at,
       c.archived_at,
       c.created_at,
       c.updated_at,
       cup.status AS user_status,
       cup.progress_percent,
       cup.completed_modules_count,
       cup.total_modules_count,
       cup.started_at AS user_started_at,
       cup.completed_at AS user_completed_at,
       cup.last_activity_at AS user_last_activity_at
     FROM courses c
     LEFT JOIN course_user_progress cup
       ON cup.course_id = c.id
      AND cup.user_id = ?
     WHERE c.id = ?
       AND c.status = 'published'
     LIMIT 1`,
    [userId, courseId],
  );

  if (!courseRows.length) {
    return null;
  }

  const row = courseRows[0];
  const course = mapCourseRow(row);

  // Загружаем разделы с прогрессом
  const [sectionRows] = await pool.execute(
    `SELECT
       cs.id,
       cs.course_id,
       cs.title,
       cs.description,
       cs.order_index,
       cs.assessment_id,
       cs.is_required,
       cs.estimated_minutes,
       cs.created_at,
       cs.updated_at,
       csup.status AS user_section_status,
       csup.best_score_percent AS section_best_score,
       csup.attempt_count AS section_attempt_count,
       csup.last_attempt_id AS section_last_attempt_id,
       csup.started_at AS section_started_at,
       csup.completed_at AS section_completed_at
     FROM course_sections cs
     LEFT JOIN course_section_user_progress csup
       ON csup.section_id = cs.id
      AND csup.user_id = ?
     WHERE cs.course_id = ?
     ORDER BY cs.order_index ASC`,
    [userId, courseId],
  );

  // Загружаем все темы курса с прогрессом одним запросом
  const [topicRows] = await pool.execute(
    `SELECT
       ct.id,
       ct.section_id,
       ct.course_id,
       ct.title,
       ct.order_index,
       ct.has_material,
       ct.content,
       ct.assessment_id,
       ct.created_at,
       ct.updated_at,
       ctup.status AS user_topic_status,
       ctup.material_viewed,
       ctup.best_score_percent AS topic_best_score,
       ctup.attempt_count AS topic_attempt_count,
       ctup.last_attempt_id AS topic_last_attempt_id,
       ctup.completed_at AS topic_completed_at
     FROM course_topics ct
     LEFT JOIN course_topic_user_progress ctup
       ON ctup.topic_id = ct.id
      AND ctup.user_id = ?
     WHERE ct.course_id = ?
     ORDER BY ct.section_id ASC, ct.order_index ASC`,
    [userId, courseId],
  );

  // Группируем темы по section_id
  const topicsBySectionId = {};
  for (const topicRow of topicRows) {
    const sId = Number(topicRow.section_id);
    if (!topicsBySectionId[sId]) {
      topicsBySectionId[sId] = [];
    }
    topicsBySectionId[sId].push({
      ...mapTopicRow(topicRow),
      progress: {
        status: topicRow.user_topic_status || "not_started",
        materialViewed: Boolean(topicRow.material_viewed),
        bestScorePercent: topicRow.topic_best_score != null ? Number(topicRow.topic_best_score) : null,
        attemptCount: topicRow.topic_attempt_count != null ? Number(topicRow.topic_attempt_count) : 0,
        lastAttemptId: topicRow.topic_last_attempt_id != null ? Number(topicRow.topic_last_attempt_id) : null,
        completedAt: toIsoUtc(topicRow.topic_completed_at),
      },
    });
  }

  // Вычисляем статусы блокировки разделов и тем
  const sections = sectionRows.map((sectionRow, sectionIndex) => {
    const section = mapSectionRow(sectionRow);
    const sectionProgress = {
      status: sectionRow.user_section_status || "not_started",
      bestScorePercent: sectionRow.section_best_score != null ? Number(sectionRow.section_best_score) : null,
      attemptCount: sectionRow.section_attempt_count != null ? Number(sectionRow.section_attempt_count) : 0,
      lastAttemptId: sectionRow.section_last_attempt_id != null ? Number(sectionRow.section_last_attempt_id) : null,
      startedAt: toIsoUtc(sectionRow.section_started_at),
      completedAt: toIsoUtc(sectionRow.section_completed_at),
    };

    // Раздел заблокирован, если предыдущий ОБЯЗАТЕЛЬНЫЙ раздел не пройден
    const prevRequiredSections = sectionRows.slice(0, sectionIndex).filter((s) => Boolean(s.is_required));
    const isLocked = prevRequiredSections.some((s) => (s.user_section_status || "not_started") !== "passed");

    const topics = (topicsBySectionId[section.id] || []).map((topic, topicIndex) => {
      // Тема заблокирована, если раздел заблокирован или предыдущая тема не завершена
      const prevTopic = topicsBySectionId[section.id]?.[topicIndex - 1];
      const isTopicLocked = isLocked || (prevTopic && prevTopic.progress.status !== "completed");

      return {
        ...topic,
        progress: {
          ...topic.progress,
          locked: isTopicLocked,
        },
      };
    });

    // Все темы раздела завершены?
    const allTopicsCompleted = topics.length > 0 && topics.every((t) => t.progress.status === "completed");
    // Тест раздела доступен?
    const sectionTestAvailable = !isLocked && allTopicsCompleted && !!section.assessmentId;

    return {
      ...section,
      progress: {
        ...sectionProgress,
        locked: isLocked,
        allTopicsCompleted,
        sectionTestAvailable,
      },
      topics,
    };
  });

  const finalAccess = await canAccessFinalAssessment({ courseId, userId });
  const snapshot = await getCourseSnapshot(courseId, userId);

  return {
    ...course,
    progress: {
      status: row.user_status || "not_started",
      progressPercent: row.progress_percent != null ? Number(row.progress_percent) : 0,
      completedSectionsCount: row.completed_modules_count != null ? Number(row.completed_modules_count) : 0,
      totalSectionsCount: row.total_modules_count != null ? Number(row.total_modules_count) : sections.filter((s) => s.isRequired).length,
      startedAt: toIsoUtc(row.user_started_at),
      completedAt: toIsoUtc(row.user_completed_at),
      lastActivityAt: toIsoUtc(row.user_last_activity_at),
    },
    sections,
    finalAssessment: {
      id: course.finalAssessmentId,
      available: finalAccess.allowed,
      reason: finalAccess.allowed ? null : finalAccess.reason,
      passedRequiredSections: finalAccess.passedRequiredSections || 0,
      totalRequiredSections: finalAccess.totalRequiredSections || sections.filter((s) => s.isRequired).length,
    },
    snapshot,
  };
}

async function getCourseProgressForUser(courseId, userId) {
  const [rows] = await pool.execute(
    `SELECT
       cup.status,
       cup.progress_percent,
       cup.completed_modules_count,
       cup.total_modules_count,
       cup.started_at,
       cup.completed_at,
       cup.last_activity_at
     FROM course_user_progress cup
     WHERE cup.course_id = ? AND cup.user_id = ?
     LIMIT 1`,
    [courseId, userId],
  );

  if (!rows.length) {
    return {
      status: "not_started",
      progressPercent: 0,
      completedSectionsCount: 0,
      totalSectionsCount: 0,
      startedAt: null,
      completedAt: null,
      lastActivityAt: null,
    };
  }

  const row = rows[0];
  return {
    status: row.status,
    progressPercent: row.progress_percent != null ? Number(row.progress_percent) : 0,
    completedSectionsCount: row.completed_modules_count != null ? Number(row.completed_modules_count) : 0,
    totalSectionsCount: row.total_modules_count != null ? Number(row.total_modules_count) : 0,
    startedAt: toIsoUtc(row.started_at),
    completedAt: toIsoUtc(row.completed_at),
    lastActivityAt: toIsoUtc(row.last_activity_at),
  };
}

async function listCoursesForAdmin({ status, search } = {}) {
  const params = [];
  const filters = [];

  if (status) {
    filters.push("c.status = ?");
    params.push(status);
  }

  if (search) {
    filters.push("(c.title LIKE ? OR c.description LIKE ?)");
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const [rows] = await pool.execute(
    `SELECT
       c.id,
       c.title,
       c.description,
       c.status,
       c.version,
       c.final_assessment_id,
       c.created_by,
       c.updated_by,
       c.published_at,
       c.archived_at,
       c.created_at,
       c.updated_at,
       (
         SELECT COUNT(*)
         FROM course_sections cs
         WHERE cs.course_id = c.id
       ) AS sections_count
     FROM courses c
     ${whereClause}
     ORDER BY c.updated_at DESC, c.id DESC`,
    params,
  );

  return rows.map((row) => ({
    ...mapCourseRow(row),
    sectionsCount: Number(row.sections_count || 0),
  }));
}

async function getCourseByIdForAdmin(courseId) {
  const course = await findById(courseId);
  if (!course) {
    return null;
  }

  const sections = await listSectionsByCourseId(courseId);

  // Загружаем темы для каждого раздела
  const sectionsWithTopics = await Promise.all(
    sections.map(async (section) => {
      const topics = await listTopicsBySectionId(section.id);
      return { ...section, topics };
    }),
  );

  const integrity = await validatePublicationIntegrity(courseId);

  return {
    ...course,
    sections: sectionsWithTopics,
    publication: {
      valid: integrity.valid,
      errors: integrity.errors,
    },
  };
}

async function createCourse({ title, description, finalAssessmentId, userId }) {
  const [result] = await pool.execute(
    `INSERT INTO courses
      (title, description, status, version, final_assessment_id, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, 'draft', 0, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [title, description || "", finalAssessmentId || null, userId || null, userId || null],
  );

  return findById(result.insertId);
}

async function updateCourse(courseId, { title, description, finalAssessmentId, status, userId }) {
  const fields = [];
  const params = [];

  if (title !== undefined) {
    fields.push("title = ?");
    params.push(title);
  }
  if (description !== undefined) {
    fields.push("description = ?");
    params.push(description || "");
  }
  if (finalAssessmentId !== undefined) {
    fields.push("final_assessment_id = ?");
    params.push(finalAssessmentId || null);
  }
  if (status !== undefined) {
    fields.push("status = ?");
    params.push(status);
  }

  fields.push("updated_by = ?");
  params.push(userId || null);
  fields.push("updated_at = UTC_TIMESTAMP()");

  params.push(courseId);
  await pool.execute(`UPDATE courses SET ${fields.join(", ")} WHERE id = ?`, params);

  return findById(courseId);
}

async function deleteCourse(courseId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [progressRows] = await connection.execute(
      `SELECT id
         FROM course_user_progress
        WHERE course_id = ?
        LIMIT 1`,
      [courseId],
    );
    if (progressRows.length) {
      const error = new Error("Нельзя удалить курс, по которому уже есть прогресс пользователей");
      error.status = 409;
      throw error;
    }

    await connection.execute("DELETE FROM courses WHERE id = ?", [courseId]);
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createCourseSection(courseId, { title, description, orderIndex, assessmentId, isRequired, estimatedMinutes }, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [courseRows] = await connection.execute("SELECT id, status, version FROM courses WHERE id = ? FOR UPDATE", [courseId]);
    if (!courseRows.length) {
      const error = new Error("Курс не найден");
      error.status = 404;
      throw error;
    }

    let targetOrderIndex = orderIndex;
    if (targetOrderIndex === undefined || targetOrderIndex === null) {
      const [[orderRow]] = await connection.execute("SELECT COALESCE(MAX(order_index), 0) AS max_order FROM course_sections WHERE course_id = ?", [
        courseId,
      ]);
      targetOrderIndex = Number(orderRow.max_order || 0) + 1;
    }

    // Сдвигаем существующие разделы при вставке в конкретную позицию
    await connection.execute(
      `UPDATE course_sections
          SET order_index = order_index + 1
        WHERE course_id = ?
          AND order_index >= ?`,
      [courseId, targetOrderIndex],
    );

    const [result] = await connection.execute(
      `INSERT INTO course_sections
        (course_id, title, description, order_index, assessment_id, is_required, estimated_minutes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [courseId, title, description || "", targetOrderIndex, assessmentId || null, isRequired ? 1 : 0, estimatedMinutes || null],
    );

    if (courseRows[0].status === "published") {
      await connection.execute(`UPDATE courses SET version = version + 1, updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?`, [
        userId || null,
        courseId,
      ]);
    } else {
      await connection.execute(`UPDATE courses SET updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?`, [userId || null, courseId]);
    }

    await connection.commit();

    const sections = await listSectionsByCourseId(courseId);
    return sections.find((s) => s.id === result.insertId) || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateCourseSection(sectionId, payload, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [sectionRows] = await connection.execute("SELECT id, course_id, order_index FROM course_sections WHERE id = ? LIMIT 1 FOR UPDATE", [
      sectionId,
    ]);
    if (!sectionRows.length) {
      const error = new Error("Раздел не найден");
      error.status = 404;
      throw error;
    }
    const sectionRow = sectionRows[0];

    const [courseRows] = await connection.execute("SELECT id, status FROM courses WHERE id = ? FOR UPDATE", [sectionRow.course_id]);
    if (!courseRows.length) {
      const error = new Error("Курс не найден");
      error.status = 404;
      throw error;
    }

    const fields = [];
    const params = [];

    if (payload.title !== undefined) {
      fields.push("title = ?");
      params.push(payload.title);
    }
    if (payload.description !== undefined) {
      fields.push("description = ?");
      params.push(payload.description || "");
    }
    if (payload.assessmentId !== undefined) {
      fields.push("assessment_id = ?");
      params.push(payload.assessmentId || null);
    }
    if (payload.isRequired !== undefined) {
      fields.push("is_required = ?");
      params.push(payload.isRequired ? 1 : 0);
    }
    if (payload.estimatedMinutes !== undefined) {
      fields.push("estimated_minutes = ?");
      params.push(payload.estimatedMinutes || null);
    }

    if (payload.orderIndex !== undefined && payload.orderIndex !== null && Number(payload.orderIndex) !== Number(sectionRow.order_index)) {
      const targetOrder = Number(payload.orderIndex);
      const currentOrder = Number(sectionRow.order_index);

      if (targetOrder > currentOrder) {
        await connection.execute(
          "UPDATE course_sections SET order_index = order_index - 1 WHERE course_id = ? AND order_index > ? AND order_index <= ?",
          [sectionRow.course_id, currentOrder, targetOrder],
        );
      } else {
        await connection.execute(
          "UPDATE course_sections SET order_index = order_index + 1 WHERE course_id = ? AND order_index >= ? AND order_index < ?",
          [sectionRow.course_id, targetOrder, currentOrder],
        );
      }
      fields.push("order_index = ?");
      params.push(targetOrder);
    }

    if (fields.length > 0) {
      fields.push("updated_at = UTC_TIMESTAMP()");
      params.push(sectionId);
      await connection.execute(`UPDATE course_sections SET ${fields.join(", ")} WHERE id = ?`, params);
    }

    if (courseRows[0].status === "published") {
      await connection.execute("UPDATE courses SET version = version + 1, updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [
        userId || null,
        sectionRow.course_id,
      ]);
    } else {
      await connection.execute("UPDATE courses SET updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [
        userId || null,
        sectionRow.course_id,
      ]);
    }

    await connection.commit();
    const sections = await listSectionsByCourseId(sectionRow.course_id);
    return sections.find((s) => s.id === Number(sectionId)) || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteCourseSection(sectionId, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [sectionRows] = await connection.execute("SELECT id, course_id, order_index FROM course_sections WHERE id = ? LIMIT 1 FOR UPDATE", [
      sectionId,
    ]);
    if (!sectionRows.length) {
      const error = new Error("Раздел не найден");
      error.status = 404;
      throw error;
    }

    const sectionRow = sectionRows[0];

    await connection.execute("DELETE FROM course_sections WHERE id = ?", [sectionId]);

    await connection.execute("UPDATE course_sections SET order_index = order_index - 1 WHERE course_id = ? AND order_index > ?", [
      sectionRow.course_id,
      sectionRow.order_index,
    ]);

    const [courseRows] = await connection.execute("SELECT status FROM courses WHERE id = ? FOR UPDATE", [sectionRow.course_id]);
    if (courseRows.length && courseRows[0].status === "published") {
      await connection.execute("UPDATE courses SET version = version + 1, updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [
        userId || null,
        sectionRow.course_id,
      ]);
    } else {
      await connection.execute("UPDATE courses SET updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [
        userId || null,
        sectionRow.course_id,
      ]);
    }

    await connection.commit();
    return { courseId: Number(sectionRow.course_id) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createCourseTopic(sectionId, { title, orderIndex, hasMaterial, content, assessmentId }, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [sectionRows] = await connection.execute("SELECT id, course_id FROM course_sections WHERE id = ? FOR UPDATE", [sectionId]);
    if (!sectionRows.length) {
      const error = new Error("Раздел не найден");
      error.status = 404;
      throw error;
    }
    const { course_id: courseId } = sectionRows[0];

    if (!hasMaterial && !assessmentId) {
      const error = new Error("Тема должна содержать материал или тест");
      error.status = 422;
      throw error;
    }

    let targetOrderIndex = orderIndex;
    if (targetOrderIndex === undefined || targetOrderIndex === null) {
      const [[orderRow]] = await connection.execute("SELECT COALESCE(MAX(order_index), 0) AS max_order FROM course_topics WHERE section_id = ?", [
        sectionId,
      ]);
      targetOrderIndex = Number(orderRow.max_order || 0) + 1;
    }

    await connection.execute("UPDATE course_topics SET order_index = order_index + 1 WHERE section_id = ? AND order_index >= ?", [
      sectionId,
      targetOrderIndex,
    ]);

    const [result] = await connection.execute(
      `INSERT INTO course_topics
        (section_id, course_id, title, order_index, has_material, content, assessment_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [sectionId, courseId, title, targetOrderIndex, hasMaterial ? 1 : 0, content || null, assessmentId || null],
    );

    await connection.execute("UPDATE courses SET updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [userId || null, courseId]);

    await connection.commit();

    const topics = await listTopicsBySectionId(sectionId);
    return topics.find((t) => t.id === result.insertId) || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateCourseTopic(topicId, payload, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [topicRows] = await connection.execute(
      "SELECT id, section_id, course_id, order_index, has_material, assessment_id FROM course_topics WHERE id = ? LIMIT 1 FOR UPDATE",
      [topicId],
    );
    if (!topicRows.length) {
      const error = new Error("Тема не найдена");
      error.status = 404;
      throw error;
    }
    const topicRow = topicRows[0];

    const resolvedHasMaterial = payload.hasMaterial !== undefined ? payload.hasMaterial : Boolean(topicRow.has_material);
    const resolvedAssessmentId = payload.assessmentId !== undefined ? payload.assessmentId || null : topicRow.assessment_id;

    if (!resolvedHasMaterial && !resolvedAssessmentId) {
      const error = new Error("Тема должна содержать материал или тест");
      error.status = 422;
      throw error;
    }

    const fields = [];
    const params = [];

    if (payload.title !== undefined) {
      fields.push("title = ?");
      params.push(payload.title);
    }
    if (payload.hasMaterial !== undefined) {
      fields.push("has_material = ?");
      params.push(payload.hasMaterial ? 1 : 0);
    }
    if (payload.content !== undefined) {
      fields.push("content = ?");
      params.push(payload.content || null);
    }
    if (payload.assessmentId !== undefined) {
      fields.push("assessment_id = ?");
      params.push(payload.assessmentId || null);
    }

    if (payload.orderIndex !== undefined && Number(payload.orderIndex) !== Number(topicRow.order_index)) {
      const targetOrder = Number(payload.orderIndex);
      const currentOrder = Number(topicRow.order_index);

      if (targetOrder > currentOrder) {
        await connection.execute(
          "UPDATE course_topics SET order_index = order_index - 1 WHERE section_id = ? AND order_index > ? AND order_index <= ?",
          [topicRow.section_id, currentOrder, targetOrder],
        );
      } else {
        await connection.execute(
          "UPDATE course_topics SET order_index = order_index + 1 WHERE section_id = ? AND order_index >= ? AND order_index < ?",
          [topicRow.section_id, targetOrder, currentOrder],
        );
      }
      fields.push("order_index = ?");
      params.push(targetOrder);
    }

    if (fields.length > 0) {
      fields.push("updated_at = UTC_TIMESTAMP()");
      params.push(topicId);
      await connection.execute(`UPDATE course_topics SET ${fields.join(", ")} WHERE id = ?`, params);
    }

    await connection.execute("UPDATE courses SET updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [userId || null, topicRow.course_id]);

    await connection.commit();
    const topics = await listTopicsBySectionId(topicRow.section_id);
    return topics.find((t) => t.id === Number(topicId)) || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteCourseTopic(topicId, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [topicRows] = await connection.execute("SELECT id, section_id, course_id, order_index FROM course_topics WHERE id = ? LIMIT 1 FOR UPDATE", [
      topicId,
    ]);
    if (!topicRows.length) {
      const error = new Error("Тема не найдена");
      error.status = 404;
      throw error;
    }
    const topicRow = topicRows[0];

    await connection.execute("DELETE FROM course_topics WHERE id = ?", [topicId]);

    await connection.execute("UPDATE course_topics SET order_index = order_index - 1 WHERE section_id = ? AND order_index > ?", [
      topicRow.section_id,
      topicRow.order_index,
    ]);

    await connection.execute("UPDATE courses SET updated_by = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [userId || null, topicRow.course_id]);

    await connection.commit();
    return { courseId: Number(topicRow.course_id), sectionId: Number(topicRow.section_id) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function upsertCourseProgressOnStart({ courseId, userId, totalRequiredSectionsCount, connection }) {
  await connection.execute(
    `INSERT INTO course_user_progress
      (course_id, user_id, status, progress_percent, completed_modules_count, total_modules_count, started_at, last_activity_at, created_at, updated_at)
     VALUES (?, ?, 'in_progress', 0.00, 0, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       status = IF(status = 'completed', status, 'in_progress'),
       total_modules_count = VALUES(total_modules_count),
       started_at = IF(started_at IS NULL, UTC_TIMESTAMP(), started_at),
       last_activity_at = UTC_TIMESTAMP(),
       updated_at = UTC_TIMESTAMP()`,
    [courseId, userId, totalRequiredSectionsCount],
  );
}

async function ensureSectionAndTopicProgressOnStart({ courseId, userId, sections, topicsBySectionId, connection }) {
  for (const section of sections) {
    await connection.execute(
      `INSERT INTO course_section_user_progress
        (course_id, section_id, user_id, status, attempt_count, created_at, updated_at)
       VALUES (?, ?, ?, 'not_started', 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP()`,
      [courseId, section.id, userId],
    );

    for (const topic of topicsBySectionId[section.id] || []) {
      await connection.execute(
        `INSERT INTO course_topic_user_progress
          (topic_id, section_id, course_id, user_id, status, material_viewed, attempt_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'not_started', 0, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP()`,
        [topic.id, section.id, courseId, userId],
      );
    }
  }
}

async function ensureCourseSnapshotOnStart({ courseId, userId, course, sections, topicsBySectionId, connection }) {
  const topicsMap = {};
  for (const [sId, topics] of Object.entries(topicsBySectionId)) {
    topicsMap[sId] = topics;
  }
  const snapshot = buildCourseSnapshot(course, sections, topicsMap);

  await connection.execute(
    `INSERT INTO course_user_snapshots
      (course_id, user_id, course_version, snapshot_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE updated_at = updated_at`,
    [courseId, userId, course.version, JSON.stringify(snapshot)],
  );
}

async function startCourseProgress(courseId, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const course = await findById(courseId, { connection, forUpdate: true });
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

    const sections = await listSectionsByCourseId(courseId, { connection });
    if (!sections.length) {
      const error = new Error("В курсе нет разделов для прохождения");
      error.status = 409;
      throw error;
    }

    const topicsBySectionId = {};
    for (const section of sections) {
      topicsBySectionId[section.id] = await listTopicsBySectionId(section.id, { connection });
    }

    const totalRequiredSectionsCount = sections.filter((s) => s.isRequired).length;

    await upsertCourseProgressOnStart({ courseId, userId, totalRequiredSectionsCount, connection });

    await ensureSectionAndTopicProgressOnStart({ courseId, userId, sections, topicsBySectionId, connection });

    await ensureCourseSnapshotOnStart({ courseId, userId, course, sections, topicsBySectionId, connection });

    await connection.commit();

    return { course, sections };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getSectionWithCourse(sectionId, options = {}) {
  const { connection } = options;
  const executor = connection || pool;
  const lockClause = options.forUpdate ? " FOR UPDATE" : "";

  const [rows] = await executor.execute(
    `SELECT
       cs.id,
       cs.course_id,
       cs.title,
       cs.description,
       cs.order_index,
       cs.assessment_id,
       cs.is_required,
       cs.estimated_minutes,
       c.status AS course_status,
       c.final_assessment_id
     FROM course_sections cs
     JOIN courses c ON c.id = cs.course_id
     WHERE cs.id = ?${lockClause}`,
    [sectionId],
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    id: Number(row.id),
    courseId: Number(row.course_id),
    title: row.title,
    description: row.description || "",
    orderIndex: Number(row.order_index),
    assessmentId: row.assessment_id ? Number(row.assessment_id) : null,
    isRequired: Boolean(row.is_required),
    estimatedMinutes: row.estimated_minutes ? Number(row.estimated_minutes) : null,
    courseStatus: row.course_status,
    finalAssessmentId: row.final_assessment_id ? Number(row.final_assessment_id) : null,
  };
}

async function getTopicWithSection(topicId, options = {}) {
  const { connection } = options;
  const executor = connection || pool;
  const lockClause = options.forUpdate ? " FOR UPDATE" : "";

  const [rows] = await executor.execute(
    `SELECT
       ct.id,
       ct.section_id,
       ct.course_id,
       ct.title,
       ct.order_index,
       ct.has_material,
       ct.assessment_id,
       cs.assessment_id AS section_assessment_id,
       c.status AS course_status
     FROM course_topics ct
     JOIN course_sections cs ON cs.id = ct.section_id
     JOIN courses c ON c.id = ct.course_id
     WHERE ct.id = ?${lockClause}`,
    [topicId],
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    id: Number(row.id),
    sectionId: Number(row.section_id),
    courseId: Number(row.course_id),
    title: row.title,
    orderIndex: Number(row.order_index),
    hasMaterial: Boolean(row.has_material),
    assessmentId: row.assessment_id ? Number(row.assessment_id) : null,
    sectionAssessmentId: row.section_assessment_id ? Number(row.section_assessment_id) : null,
    courseStatus: row.course_status,
  };
}

async function getSectionAttemptResult({ sectionId, userId, attemptId, connection }) {
  const [rows] = await connection.execute(
    `SELECT
       cs.id AS section_id,
       cs.course_id,
       cs.assessment_id,
       aa.id AS attempt_id,
       aa.attempt_number,
       aa.score_percent,
       a.pass_score_percent
     FROM course_sections cs
     JOIN assessment_attempts aa ON aa.assessment_id = cs.assessment_id
     JOIN assessments a ON a.id = aa.assessment_id
     WHERE cs.id = ?
       AND aa.id = ?
       AND aa.user_id = ?
       AND aa.status = 'completed'
     LIMIT 1`,
    [sectionId, attemptId, userId],
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  const scorePercent = row.score_percent != null ? Number(row.score_percent) : 0;
  const passScorePercent = row.pass_score_percent != null ? Number(row.pass_score_percent) : 0;

  return {
    sectionId: Number(row.section_id),
    courseId: Number(row.course_id),
    assessmentId: Number(row.assessment_id),
    attemptId: Number(row.attempt_id),
    attemptNumber: Number(row.attempt_number || 0),
    scorePercent,
    passScorePercent,
    passed: scorePercent >= passScorePercent,
  };
}

async function getTopicAttemptResult({ topicId, userId, attemptId, connection }) {
  const [rows] = await connection.execute(
    `SELECT
       ct.id AS topic_id,
       ct.section_id,
       ct.course_id,
       ct.assessment_id,
       aa.id AS attempt_id,
       aa.attempt_number,
       aa.score_percent,
       a.pass_score_percent
     FROM course_topics ct
     JOIN assessment_attempts aa ON aa.assessment_id = ct.assessment_id
     JOIN assessments a ON a.id = aa.assessment_id
     WHERE ct.id = ?
       AND aa.id = ?
       AND aa.user_id = ?
       AND aa.status = 'completed'
     LIMIT 1`,
    [topicId, attemptId, userId],
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  const scorePercent = row.score_percent != null ? Number(row.score_percent) : 0;
  const passScorePercent = row.pass_score_percent != null ? Number(row.pass_score_percent) : 0;

  return {
    topicId: Number(row.topic_id),
    sectionId: Number(row.section_id),
    courseId: Number(row.course_id),
    assessmentId: Number(row.assessment_id),
    attemptId: Number(row.attempt_id),
    attemptNumber: Number(row.attempt_number || 0),
    scorePercent,
    passScorePercent,
    passed: scorePercent >= passScorePercent,
  };
}

async function getFinalAttemptResult({ courseId, userId, attemptId, connection }) {
  const [rows] = await connection.execute(
    `SELECT
       c.id AS course_id,
       c.final_assessment_id,
       aa.id AS attempt_id,
       aa.attempt_number,
       aa.score_percent,
       a.pass_score_percent
     FROM courses c
     JOIN assessment_attempts aa ON aa.assessment_id = c.final_assessment_id
     JOIN assessments a ON a.id = aa.assessment_id
     WHERE c.id = ?
       AND aa.id = ?
       AND aa.user_id = ?
       AND aa.status = 'completed'
     LIMIT 1`,
    [courseId, attemptId, userId],
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  const scorePercent = row.score_percent != null ? Number(row.score_percent) : 0;
  const passScorePercent = row.pass_score_percent != null ? Number(row.pass_score_percent) : 0;

  return {
    courseId: Number(row.course_id),
    finalAssessmentId: Number(row.final_assessment_id),
    attemptId: Number(row.attempt_id),
    attemptNumber: Number(row.attempt_number || 0),
    scorePercent,
    passScorePercent,
    passed: scorePercent >= passScorePercent,
  };
}

async function upsertSectionProgressFromAttempt({ sectionAttemptResult, userId, connection }) {
  const status = sectionAttemptResult.passed ? "passed" : "failed";
  await connection.execute(
    `INSERT INTO course_section_user_progress
      (course_id, section_id, user_id, status, last_attempt_id, best_score_percent, attempt_count, started_at, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), IF(? = 'passed', UTC_TIMESTAMP(), NULL), UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       last_attempt_id = VALUES(last_attempt_id),
       best_score_percent = GREATEST(IFNULL(best_score_percent, 0), VALUES(best_score_percent)),
       attempt_count = GREATEST(IFNULL(attempt_count, 0), VALUES(attempt_count)),
       started_at = IF(started_at IS NULL, UTC_TIMESTAMP(), started_at),
       completed_at = IF(VALUES(status) = 'passed', UTC_TIMESTAMP(), completed_at),
       updated_at = UTC_TIMESTAMP()`,
    [
      sectionAttemptResult.courseId,
      sectionAttemptResult.sectionId,
      userId,
      status,
      sectionAttemptResult.attemptId,
      sectionAttemptResult.scorePercent,
      sectionAttemptResult.attemptNumber,
      status,
    ],
  );
}

async function upsertTopicProgressFromAttempt({ topicAttemptResult, userId, connection }) {
  // Тема с тестом завершена только если тест пройден
  const status = topicAttemptResult.passed ? "completed" : "failed";
  await connection.execute(
    `INSERT INTO course_topic_user_progress
      (topic_id, section_id, course_id, user_id, status, last_attempt_id, best_score_percent, attempt_count, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, IF(? = 'completed', UTC_TIMESTAMP(), NULL), UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       last_attempt_id = VALUES(last_attempt_id),
       best_score_percent = GREATEST(IFNULL(best_score_percent, 0), VALUES(best_score_percent)),
       attempt_count = GREATEST(IFNULL(attempt_count, 0), VALUES(attempt_count)),
       completed_at = IF(VALUES(status) = 'completed', UTC_TIMESTAMP(), completed_at),
       updated_at = UTC_TIMESTAMP()`,
    [
      topicAttemptResult.topicId,
      topicAttemptResult.sectionId,
      topicAttemptResult.courseId,
      userId,
      status,
      topicAttemptResult.attemptId,
      topicAttemptResult.scorePercent,
      topicAttemptResult.attemptNumber,
      status,
    ],
  );
}

async function getUserCourseAggregate({ courseId, userId, connection }) {
  const [[aggregate]] = await connection.execute(
    `SELECT
       COUNT(CASE WHEN cs.is_required = 1 THEN 1 END) AS total_required_sections,
       COUNT(CASE WHEN csup.status = 'passed' AND cs.is_required = 1 THEN 1 END) AS passed_required_sections
     FROM course_sections cs
     LEFT JOIN course_section_user_progress csup
       ON csup.section_id = cs.id
      AND csup.user_id = ?
     WHERE cs.course_id = ?`,
    [userId, courseId],
  );

  const totalRequiredSections = Number(aggregate?.total_required_sections || 0);
  const passedRequiredSections = Number(aggregate?.passed_required_sections || 0);
  const progressPercent = totalRequiredSections > 0 ? Number(((passedRequiredSections / totalRequiredSections) * 100).toFixed(2)) : 0;

  return {
    totalRequiredSections,
    passedRequiredSections,
    progressPercent,
  };
}

async function syncCourseProgressFromSections({ courseId, userId, connection }) {
  const aggregate = await getUserCourseAggregate({ courseId, userId, connection });
  const status = aggregate.passedRequiredSections > 0 ? "in_progress" : "not_started";

  await connection.execute(
    `INSERT INTO course_user_progress
      (course_id, user_id, status, progress_percent, completed_modules_count, total_modules_count, started_at, last_activity_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, IF(? = 'not_started', NULL, UTC_TIMESTAMP()), UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       status = IF(status = 'completed', status, VALUES(status)),
       progress_percent = VALUES(progress_percent),
       completed_modules_count = VALUES(completed_modules_count),
       total_modules_count = VALUES(total_modules_count),
       started_at = IF(started_at IS NULL AND VALUES(status) <> 'not_started', UTC_TIMESTAMP(), started_at),
       last_activity_at = UTC_TIMESTAMP(),
       updated_at = UTC_TIMESTAMP()`,
    [courseId, userId, status, aggregate.progressPercent, aggregate.passedRequiredSections, aggregate.totalRequiredSections, status],
  );

  return aggregate;
}

async function markTopicMaterialViewed({ topicId, userId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const topic = await getTopicWithSection(topicId, { connection, forUpdate: true });
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

    // Если у темы нет теста — просмотр материала завершает тему
    const completedStatus = !topic.assessmentId ? "completed" : "in_progress";

    await connection.execute(
      `INSERT INTO course_topic_user_progress
        (topic_id, section_id, course_id, user_id, material_viewed, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE
         material_viewed = 1,
         status = IF(status IN ('completed','failed'), status, VALUES(status)),
         completed_at = IF(VALUES(status) = 'completed' AND completed_at IS NULL, UTC_TIMESTAMP(), completed_at),
         updated_at = UTC_TIMESTAMP()`,
      [topicId, topic.sectionId, topic.courseId, userId, completedStatus],
    );

    // Если тема завершена — синхронизируем прогресс курса
    if (completedStatus === "completed") {
      await syncCourseProgressFromSections({ courseId: topic.courseId, userId, connection });
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

async function markTopicAttemptCompleted({ topicId, userId, attemptId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const topicAttemptResult = await getTopicAttemptResult({ topicId, userId, attemptId, connection });
    if (!topicAttemptResult) {
      const error = new Error("Результат попытки для темы не найден");
      error.status = 404;
      throw error;
    }

    await upsertTopicProgressFromAttempt({ topicAttemptResult, userId, connection });
    const aggregate = await syncCourseProgressFromSections({ courseId: topicAttemptResult.courseId, userId, connection });

    await connection.commit();

    return { topicAttemptResult, aggregate };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function markSectionAttemptCompleted({ sectionId, userId, attemptId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const sectionAttemptResult = await getSectionAttemptResult({ sectionId, userId, attemptId, connection });
    if (!sectionAttemptResult) {
      const error = new Error("Результат попытки для раздела не найден");
      error.status = 404;
      throw error;
    }

    await upsertSectionProgressFromAttempt({ sectionAttemptResult, userId, connection });
    const aggregate = await syncCourseProgressFromSections({ courseId: sectionAttemptResult.courseId, userId, connection });

    await connection.commit();

    return { sectionAttemptResult, aggregate };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function canAccessFinalAssessment({ courseId, userId }, options = {}) {
  const { connection } = options;
  const executor = connection || pool;

  const [courseRows] = await executor.execute("SELECT id, final_assessment_id, status FROM courses WHERE id = ? LIMIT 1", [courseId]);
  if (!courseRows.length) {
    return { allowed: false, reason: "Курс не найден" };
  }

  if (courseRows[0].status !== "published") {
    return { allowed: false, reason: "Итоговая аттестация доступна только для опубликованного курса" };
  }

  if (!courseRows[0].final_assessment_id) {
    return { allowed: false, reason: "Итоговая аттестация для курса не настроена" };
  }

  const [[aggregate]] = await executor.execute(
    `SELECT
       COUNT(CASE WHEN cs.is_required = 1 THEN 1 END) AS total_required_sections,
       COUNT(CASE WHEN csup.status = 'passed' AND cs.is_required = 1 THEN 1 END) AS passed_required_sections
     FROM course_sections cs
     LEFT JOIN course_section_user_progress csup
       ON csup.section_id = cs.id
      AND csup.user_id = ?
     WHERE cs.course_id = ?`,
    [userId, courseId],
  );

  const totalRequiredSections = Number(aggregate?.total_required_sections || 0);
  const passedRequiredSections = Number(aggregate?.passed_required_sections || 0);

  if (totalRequiredSections === 0) {
    return { allowed: false, reason: "В курсе отсутствуют обязательные разделы" };
  }

  if (passedRequiredSections < totalRequiredSections) {
    return {
      allowed: false,
      reason: "Итоговая аттестация будет доступна после прохождения всех обязательных разделов",
      totalRequiredSections,
      passedRequiredSections,
    };
  }

  return {
    allowed: true,
    finalAssessmentId: Number(courseRows[0].final_assessment_id),
    totalRequiredSections,
    passedRequiredSections,
  };
}

async function markFinalAttemptCompleted({ courseId, userId, attemptId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const access = await canAccessFinalAssessment({ courseId, userId }, { connection });
    if (!access.allowed) {
      const error = new Error(access.reason);
      error.status = 409;
      throw error;
    }

    const finalAttempt = await getFinalAttemptResult({ courseId, userId, attemptId, connection });
    if (!finalAttempt) {
      const error = new Error("Результат итоговой аттестации не найден");
      error.status = 404;
      throw error;
    }

    const aggregate = await syncCourseProgressFromSections({ courseId, userId, connection });

    if (finalAttempt.passed) {
      await connection.execute(
        `UPDATE course_user_progress
            SET status = 'completed',
                progress_percent = 100.00,
                completed_modules_count = ?,
                total_modules_count = ?,
                completed_at = UTC_TIMESTAMP(),
                last_activity_at = UTC_TIMESTAMP(),
                updated_at = UTC_TIMESTAMP()
          WHERE course_id = ? AND user_id = ?`,
        [aggregate.totalRequiredSections, aggregate.totalRequiredSections, courseId, userId],
      );
    } else {
      await connection.execute(
        `UPDATE course_user_progress
            SET status = 'in_progress',
                last_activity_at = UTC_TIMESTAMP(),
                updated_at = UTC_TIMESTAMP()
          WHERE course_id = ? AND user_id = ?`,
        [courseId, userId],
      );
    }

    await connection.commit();

    return {
      finalAttempt,
      passedCourse: finalAttempt.passed,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  findById,
  listPublishedCoursesForUser,
  getCourseForUser,
  getCourseProgressForUser,
  listSectionsByCourseId,
  listTopicsBySectionId,
  listTopicsByCourseId,
  listCoursesForAdmin,
  getCourseByIdForAdmin,
  createCourse,
  updateCourse,
  deleteCourse,
  createCourseSection,
  updateCourseSection,
  deleteCourseSection,
  createCourseTopic,
  updateCourseTopic,
  deleteCourseTopic,
  validatePublicationIntegrity,
  publishCourse,
  archiveCourse,
  startCourseProgress,
  getSectionWithCourse,
  getTopicWithSection,
  markTopicMaterialViewed,
  markTopicAttemptCompleted,
  markSectionAttemptCompleted,
  canAccessFinalAssessment,
  markFinalAttemptCompleted,
  syncCourseProgressFromSections,
};
