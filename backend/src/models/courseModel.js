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

function mapModuleRow(row) {
  return {
    id: Number(row.id),
    courseId: Number(row.course_id),
    title: row.title,
    description: row.description || "",
    content: row.content || "",
    orderIndex: Number(row.order_index),
    assessmentId: row.assessment_id ? Number(row.assessment_id) : null,
    isRequired: Boolean(row.is_required),
    estimatedMinutes: row.estimated_minutes ? Number(row.estimated_minutes) : null,
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

async function listModulesByCourseId(courseId, options = {}) {
  const { connection } = options;
  const executor = connection || pool;
  const lockClause = options.forUpdate ? " FOR UPDATE" : "";

  const [rows] = await executor.execute(
    `SELECT id, course_id, title, description, content, order_index, assessment_id, is_required, estimated_minutes, created_at, updated_at
       FROM course_modules
      WHERE course_id = ?
      ORDER BY order_index ASC${lockClause}`,
    [courseId],
  );

  return rows.map(mapModuleRow);
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
      modules: [],
    };
  }

  const modules = await listModulesByCourseId(courseId, { connection });
  const errors = [];

  if (!course.finalAssessmentId) {
    errors.push("Для публикации курса необходимо указать итоговую аттестацию");
  } else {
    const [finalAssessmentRows] = await executor.execute("SELECT id FROM assessments WHERE id = ? LIMIT 1", [course.finalAssessmentId]);
    if (!finalAssessmentRows.length) {
      errors.push("Итоговая аттестация курса не найдена");
    }
  }

  if (!modules.length) {
    errors.push("Для публикации курса необходим минимум один модуль");
  }

  for (const moduleItem of modules) {
    if (!moduleItem.assessmentId) {
      errors.push(`Для модуля "${moduleItem.title}" не назначена аттестация`);
      continue;
    }
    const [assessmentRows] = await executor.execute("SELECT id FROM assessments WHERE id = ? LIMIT 1", [moduleItem.assessmentId]);
    if (!assessmentRows.length) {
      errors.push(`Аттестация модуля "${moduleItem.title}" не найдена`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    course,
    modules,
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

function buildCourseSnapshot(course, modules) {
  return {
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      version: course.version,
      finalAssessmentId: course.finalAssessmentId,
    },
    modules: modules.map((moduleItem) => ({
      id: moduleItem.id,
      title: moduleItem.title,
      description: moduleItem.description,
      content: moduleItem.content,
      orderIndex: moduleItem.orderIndex,
      assessmentId: moduleItem.assessmentId,
      isRequired: moduleItem.isRequired,
      estimatedMinutes: moduleItem.estimatedMinutes,
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
         FROM course_modules cm
         WHERE cm.course_id = c.id
       ) AS modules_count,
       (
         SELECT COUNT(*)
         FROM course_modules cm
         WHERE cm.course_id = c.id
           AND cm.is_required = 1
       ) AS required_modules_count
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
      modulesCount: Number(row.modules_count || 0),
      requiredModulesCount: Number(row.required_modules_count || 0),
      progress: {
        status: row.user_status || "not_started",
        progressPercent: row.progress_percent != null ? Number(row.progress_percent) : 0,
        completedModulesCount: row.completed_modules_count != null ? Number(row.completed_modules_count) : 0,
        totalModulesCount: row.total_modules_count != null ? Number(row.total_modules_count) : Number(row.required_modules_count || 0),
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

  const [moduleRows] = await pool.execute(
    `SELECT
       cm.id,
       cm.course_id,
       cm.title,
       cm.description,
       cm.content,
       cm.order_index,
       cm.assessment_id,
       cm.is_required,
       cm.estimated_minutes,
       cm.created_at,
       cm.updated_at,
       cmup.status AS user_module_status,
       cmup.best_score_percent,
       cmup.attempt_count,
       cmup.last_attempt_id,
       cmup.started_at AS user_started_at,
       cmup.completed_at AS user_completed_at
     FROM course_modules cm
     LEFT JOIN course_module_user_progress cmup
       ON cmup.module_id = cm.id
      AND cmup.user_id = ?
     WHERE cm.course_id = ?
     ORDER BY cm.order_index ASC`,
    [userId, courseId],
  );

  const modules = moduleRows.map((moduleRow) => ({
    ...mapModuleRow(moduleRow),
    progress: {
      status: moduleRow.user_module_status || "not_started",
      bestScorePercent: moduleRow.best_score_percent != null ? Number(moduleRow.best_score_percent) : null,
      attemptCount: moduleRow.attempt_count != null ? Number(moduleRow.attempt_count) : 0,
      lastAttemptId: moduleRow.last_attempt_id != null ? Number(moduleRow.last_attempt_id) : null,
      startedAt: toIsoUtc(moduleRow.user_started_at),
      completedAt: toIsoUtc(moduleRow.user_completed_at),
    },
  }));

  const finalAccess = await canAccessFinalAssessment({ courseId, userId });
  const snapshot = await getCourseSnapshot(courseId, userId);

  return {
    ...course,
    progress: {
      status: row.user_status || "not_started",
      progressPercent: row.progress_percent != null ? Number(row.progress_percent) : 0,
      completedModulesCount: row.completed_modules_count != null ? Number(row.completed_modules_count) : 0,
      totalModulesCount: row.total_modules_count != null ? Number(row.total_modules_count) : modules.filter((item) => item.isRequired).length,
      startedAt: toIsoUtc(row.user_started_at),
      completedAt: toIsoUtc(row.user_completed_at),
      lastActivityAt: toIsoUtc(row.user_last_activity_at),
    },
    modules,
    finalAssessment: {
      id: course.finalAssessmentId,
      available: finalAccess.allowed,
      reason: finalAccess.allowed ? null : finalAccess.reason,
      passedRequiredModules: finalAccess.passedRequiredModules || 0,
      totalRequiredModules: finalAccess.totalRequiredModules || modules.filter((item) => item.isRequired).length,
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
      completedModulesCount: 0,
      totalModulesCount: 0,
      startedAt: null,
      completedAt: null,
      lastActivityAt: null,
    };
  }

  const row = rows[0];
  return {
    status: row.status,
    progressPercent: row.progress_percent != null ? Number(row.progress_percent) : 0,
    completedModulesCount: row.completed_modules_count != null ? Number(row.completed_modules_count) : 0,
    totalModulesCount: row.total_modules_count != null ? Number(row.total_modules_count) : 0,
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
         FROM course_modules cm
         WHERE cm.course_id = c.id
       ) AS modules_count
     FROM courses c
     ${whereClause}
     ORDER BY c.updated_at DESC, c.id DESC`,
    params,
  );

  return rows.map((row) => ({
    ...mapCourseRow(row),
    modulesCount: Number(row.modules_count || 0),
  }));
}

async function getCourseByIdForAdmin(courseId) {
  const course = await findById(courseId);
  if (!course) {
    return null;
  }

  const modules = await listModulesByCourseId(courseId);
  const integrity = await validatePublicationIntegrity(courseId);

  return {
    ...course,
    modules,
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

async function createCourseModule(courseId, { title, description, content, orderIndex, assessmentId, isRequired, estimatedMinutes }, userId) {
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
      const [[orderRow]] = await connection.execute("SELECT COALESCE(MAX(order_index), 0) AS max_order FROM course_modules WHERE course_id = ?", [courseId]);
      targetOrderIndex = Number(orderRow.max_order || 0) + 1;
    }

    await connection.execute(
      `UPDATE course_modules
          SET order_index = order_index + 1
        WHERE course_id = ?
          AND order_index >= ?`,
      [courseId, targetOrderIndex],
    );

    const [result] = await connection.execute(
      `INSERT INTO course_modules
        (course_id, title, description, content, order_index, assessment_id, is_required, estimated_minutes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [
        courseId,
        title,
        description || "",
        content || "",
        targetOrderIndex,
        assessmentId || null,
        isRequired ? 1 : 0,
        estimatedMinutes || null,
      ],
    );

    if (courseRows[0].status === "published") {
      await connection.execute(
        `UPDATE courses
            SET version = version + 1,
                updated_by = ?,
                updated_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [userId || null, courseId],
      );
    } else {
      await connection.execute(
        `UPDATE courses
            SET updated_by = ?,
                updated_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [userId || null, courseId],
      );
    }

    await connection.commit();

    const modules = await listModulesByCourseId(courseId);
    return modules.find((item) => item.id === result.insertId) || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateCourseModule(moduleId, payload, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [moduleRows] = await connection.execute(
      `SELECT id, course_id, order_index
         FROM course_modules
        WHERE id = ?
        LIMIT 1 FOR UPDATE`,
      [moduleId],
    );
    if (!moduleRows.length) {
      const error = new Error("Модуль не найден");
      error.status = 404;
      throw error;
    }
    const moduleRow = moduleRows[0];

    const [courseRows] = await connection.execute("SELECT id, status FROM courses WHERE id = ? FOR UPDATE", [moduleRow.course_id]);
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
    if (payload.content !== undefined) {
      fields.push("content = ?");
      params.push(payload.content || "");
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

    if (payload.orderIndex !== undefined && payload.orderIndex !== null && Number(payload.orderIndex) !== Number(moduleRow.order_index)) {
      const targetOrder = Number(payload.orderIndex);
      const currentOrder = Number(moduleRow.order_index);

      if (targetOrder > currentOrder) {
        await connection.execute(
          `UPDATE course_modules
              SET order_index = order_index - 1
            WHERE course_id = ?
              AND order_index > ?
              AND order_index <= ?`,
          [moduleRow.course_id, currentOrder, targetOrder],
        );
      } else {
        await connection.execute(
          `UPDATE course_modules
              SET order_index = order_index + 1
            WHERE course_id = ?
              AND order_index >= ?
              AND order_index < ?`,
          [moduleRow.course_id, targetOrder, currentOrder],
        );
      }
      fields.push("order_index = ?");
      params.push(targetOrder);
    }

    if (fields.length > 0) {
      fields.push("updated_at = UTC_TIMESTAMP()");
      params.push(moduleId);
      await connection.execute(`UPDATE course_modules SET ${fields.join(", ")} WHERE id = ?`, params);
    }

    if (courseRows[0].status === "published") {
      await connection.execute(
        `UPDATE courses
            SET version = version + 1,
                updated_by = ?,
                updated_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [userId || null, moduleRow.course_id],
      );
    } else {
      await connection.execute(
        `UPDATE courses
            SET updated_by = ?,
                updated_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [userId || null, moduleRow.course_id],
      );
    }

    await connection.commit();
    const modules = await listModulesByCourseId(moduleRow.course_id);
    return modules.find((item) => item.id === Number(moduleId)) || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteCourseModule(moduleId, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [moduleRows] = await connection.execute(
      `SELECT id, course_id, order_index
         FROM course_modules
        WHERE id = ?
        LIMIT 1 FOR UPDATE`,
      [moduleId],
    );
    if (!moduleRows.length) {
      const error = new Error("Модуль не найден");
      error.status = 404;
      throw error;
    }

    const moduleRow = moduleRows[0];

    await connection.execute("DELETE FROM course_modules WHERE id = ?", [moduleId]);

    await connection.execute(
      `UPDATE course_modules
          SET order_index = order_index - 1
        WHERE course_id = ?
          AND order_index > ?`,
      [moduleRow.course_id, moduleRow.order_index],
    );

    const [courseRows] = await connection.execute("SELECT status FROM courses WHERE id = ? FOR UPDATE", [moduleRow.course_id]);
    if (courseRows.length && courseRows[0].status === "published") {
      await connection.execute(
        `UPDATE courses
            SET version = version + 1,
                updated_by = ?,
                updated_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [userId || null, moduleRow.course_id],
      );
    } else {
      await connection.execute(
        `UPDATE courses
            SET updated_by = ?,
                updated_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [userId || null, moduleRow.course_id],
      );
    }

    await connection.commit();
    return { courseId: Number(moduleRow.course_id) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function upsertCourseProgressOnStart({ courseId, userId, totalModulesCount, connection }) {
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
    [courseId, userId, totalModulesCount],
  );
}

async function ensureModuleProgressOnStart({ courseId, userId, modules, connection }) {
  for (const moduleItem of modules) {
    await connection.execute(
      `INSERT INTO course_module_user_progress
        (course_id, module_id, user_id, status, attempt_count, created_at, updated_at)
       VALUES (?, ?, ?, 'not_started', 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP()`,
      [courseId, moduleItem.id, userId],
    );
  }
}

async function ensureCourseSnapshotOnStart({ courseId, userId, course, modules, connection }) {
  const snapshot = buildCourseSnapshot(course, modules);

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

    const modules = await listModulesByCourseId(courseId, { connection });
    if (!modules.length) {
      const error = new Error("В курсе нет модулей для прохождения");
      error.status = 409;
      throw error;
    }

    await upsertCourseProgressOnStart({
      courseId,
      userId,
      totalModulesCount: modules.length,
      connection,
    });

    await ensureModuleProgressOnStart({
      courseId,
      userId,
      modules,
      connection,
    });

    await ensureCourseSnapshotOnStart({
      courseId,
      userId,
      course,
      modules,
      connection,
    });

    await connection.commit();

    return {
      course,
      modules,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getModuleWithCourse(moduleId, options = {}) {
  const { connection } = options;
  const executor = connection || pool;
  const lockClause = options.forUpdate ? " FOR UPDATE" : "";

  const [rows] = await executor.execute(
    `SELECT
       cm.id,
       cm.course_id,
       cm.title,
       cm.description,
       cm.content,
       cm.order_index,
       cm.assessment_id,
       cm.is_required,
       cm.estimated_minutes,
       c.status AS course_status,
       c.final_assessment_id
     FROM course_modules cm
     JOIN courses c ON c.id = cm.course_id
     WHERE cm.id = ?${lockClause}`,
    [moduleId],
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
    content: row.content || "",
    orderIndex: Number(row.order_index),
    assessmentId: row.assessment_id ? Number(row.assessment_id) : null,
    isRequired: Boolean(row.is_required),
    estimatedMinutes: row.estimated_minutes ? Number(row.estimated_minutes) : null,
    courseStatus: row.course_status,
    finalAssessmentId: row.final_assessment_id ? Number(row.final_assessment_id) : null,
  };
}

async function getModuleAttemptResult({ moduleId, userId, attemptId, connection }) {
  const [rows] = await connection.execute(
    `SELECT
       cm.id AS module_id,
       cm.course_id,
       cm.assessment_id,
       aa.id AS attempt_id,
       aa.attempt_number,
       aa.score_percent,
       a.pass_score_percent
     FROM course_modules cm
     JOIN assessment_attempts aa ON aa.assessment_id = cm.assessment_id
     JOIN assessments a ON a.id = aa.assessment_id
     WHERE cm.id = ?
       AND aa.id = ?
       AND aa.user_id = ?
       AND aa.status = 'completed'
     LIMIT 1`,
    [moduleId, attemptId, userId],
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  const scorePercent = row.score_percent != null ? Number(row.score_percent) : 0;
  const passScorePercent = row.pass_score_percent != null ? Number(row.pass_score_percent) : 0;

  return {
    moduleId: Number(row.module_id),
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

async function upsertModuleProgressFromAttempt({ moduleAttemptResult, userId, connection }) {
  const status = moduleAttemptResult.passed ? "passed" : "failed";
  await connection.execute(
    `INSERT INTO course_module_user_progress
      (course_id, module_id, user_id, status, last_attempt_id, best_score_percent, attempt_count, started_at, completed_at, created_at, updated_at)
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
      moduleAttemptResult.courseId,
      moduleAttemptResult.moduleId,
      userId,
      status,
      moduleAttemptResult.attemptId,
      moduleAttemptResult.scorePercent,
      moduleAttemptResult.attemptNumber,
      status,
    ],
  );
}

async function getUserCourseAggregate({ courseId, userId, connection }) {
  const [[aggregate]] = await connection.execute(
    `SELECT
       COUNT(CASE WHEN cm.is_required = 1 THEN 1 END) AS total_required_modules,
       COUNT(CASE WHEN cmup.status = 'passed' AND cm.is_required = 1 THEN 1 END) AS passed_required_modules
     FROM course_modules cm
     LEFT JOIN course_module_user_progress cmup
       ON cmup.module_id = cm.id
      AND cmup.user_id = ?
     WHERE cm.course_id = ?`,
    [userId, courseId],
  );

  const totalRequiredModules = Number(aggregate?.total_required_modules || 0);
  const passedRequiredModules = Number(aggregate?.passed_required_modules || 0);
  const progressPercent = totalRequiredModules > 0 ? Number(((passedRequiredModules / totalRequiredModules) * 100).toFixed(2)) : 0;

  return {
    totalRequiredModules,
    passedRequiredModules,
    progressPercent,
  };
}

async function syncCourseProgressFromModules({ courseId, userId, connection }) {
  const aggregate = await getUserCourseAggregate({ courseId, userId, connection });
  const status = aggregate.passedRequiredModules > 0 ? "in_progress" : "not_started";

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
    [
      courseId,
      userId,
      status,
      aggregate.progressPercent,
      aggregate.passedRequiredModules,
      aggregate.totalRequiredModules,
      status,
    ],
  );

  return aggregate;
}

async function markModuleAttemptCompleted({ moduleId, userId, attemptId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const moduleAttemptResult = await getModuleAttemptResult({ moduleId, userId, attemptId, connection });
    if (!moduleAttemptResult) {
      const error = new Error("Результат попытки для модуля не найден");
      error.status = 404;
      throw error;
    }

    await upsertModuleProgressFromAttempt({ moduleAttemptResult, userId, connection });
    const aggregate = await syncCourseProgressFromModules({ courseId: moduleAttemptResult.courseId, userId, connection });

    await connection.commit();

    return {
      moduleAttemptResult,
      aggregate,
    };
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
       COUNT(CASE WHEN cm.is_required = 1 THEN 1 END) AS total_required_modules,
       COUNT(CASE WHEN cmup.status = 'passed' AND cm.is_required = 1 THEN 1 END) AS passed_required_modules
     FROM course_modules cm
     LEFT JOIN course_module_user_progress cmup
       ON cmup.module_id = cm.id
      AND cmup.user_id = ?
     WHERE cm.course_id = ?`,
    [userId, courseId],
  );

  const totalRequiredModules = Number(aggregate?.total_required_modules || 0);
  const passedRequiredModules = Number(aggregate?.passed_required_modules || 0);

  if (totalRequiredModules === 0) {
    return { allowed: false, reason: "В курсе отсутствуют обязательные модули" };
  }

  if (passedRequiredModules < totalRequiredModules) {
    return {
      allowed: false,
      reason: "Итоговая аттестация будет доступна после прохождения всех модулей",
      totalRequiredModules,
      passedRequiredModules,
    };
  }

  return {
    allowed: true,
    finalAssessmentId: Number(courseRows[0].final_assessment_id),
    totalRequiredModules,
    passedRequiredModules,
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

    const aggregate = await syncCourseProgressFromModules({ courseId, userId, connection });

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
        [aggregate.totalRequiredModules, aggregate.totalRequiredModules, courseId, userId],
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
  listCoursesForAdmin,
  getCourseByIdForAdmin,
  createCourse,
  updateCourse,
  deleteCourse,
  createCourseModule,
  updateCourseModule,
  deleteCourseModule,
  listModulesByCourseId,
  validatePublicationIntegrity,
  publishCourse,
  archiveCourse,
  startCourseProgress,
  getModuleWithCourse,
  markModuleAttemptCompleted,
  canAccessFinalAssessment,
  markFinalAttemptCompleted,
  syncCourseProgressFromModules,
};
