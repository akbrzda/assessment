/**
 * SQL-операции для отслеживания прогресса пользователей по курсам.
 * Все функции принимают управляемый connection — транзакции на уровне сервиса.
 */

const { pool } = require("../../config/database");

// --- Поиск с контекстом -----------------------------------------------------

async function findSectionWithCourse(sectionId, options = {}) {
  const executor = options.connection;
  const lock = options.forUpdate ? " FOR UPDATE" : "";
  const [rows] = await executor.execute(
    `SELECT cs.id, cs.course_id, cs.assessment_id, cs.is_required, c.status AS course_status, c.final_assessment_id
       FROM course_sections cs
       JOIN courses c ON c.id = cs.course_id
      WHERE cs.id = ?${lock}`,
    [sectionId],
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: Number(row.id),
    courseId: Number(row.course_id),
    assessmentId: row.assessment_id ? Number(row.assessment_id) : null,
    isRequired: Boolean(row.is_required),
    courseStatus: row.course_status,
    finalAssessmentId: row.final_assessment_id ? Number(row.final_assessment_id) : null,
  };
}

async function findTopicWithSection(topicId, options = {}) {
  const executor = options.connection;
  const lock = options.forUpdate ? " FOR UPDATE" : "";
  const [rows] = await executor.execute(
    `SELECT ct.id, ct.section_id, ct.course_id, ct.assessment_id, ct.is_required, ct.has_material, ct.content, ct.order_index,
            cs.assessment_id AS section_assessment_id, c.status AS course_status
       FROM course_topics ct
       JOIN course_sections cs ON cs.id = ct.section_id
       JOIN courses c ON c.id = ct.course_id
      WHERE ct.id = ?${lock}`,
    [topicId],
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: Number(row.id),
    sectionId: Number(row.section_id),
    courseId: Number(row.course_id),
    assessmentId: row.assessment_id ? Number(row.assessment_id) : null,
    isRequired: Boolean(row.is_required),
    hasMaterial: Boolean(row.has_material),
    content: row.content || "",
    orderIndex: Number(row.order_index || 0),
    sectionAssessmentId: row.section_assessment_id ? Number(row.section_assessment_id) : null,
    courseStatus: row.course_status,
  };
}

/**
 * Проверяет, завершена ли предыдущая тема в разделе.
 * Если предыдущей темы нет — возвращает true (доступ разрешён).
 */
async function isPreviousTopicCompleted({ sectionId, orderIndex, userId }, options = {}) {
  const currentIsRequired = options.currentIsRequired !== undefined ? Boolean(options.currentIsRequired) : true;
  if (!currentIsRequired) {
    return true;
  }

  const executor = options.connection || pool;
  const [rows] = await executor.execute(
    `SELECT ctup.status
       FROM course_topics ct
       LEFT JOIN course_topic_user_progress ctup ON ctup.topic_id = ct.id AND ctup.user_id = ?
      WHERE ct.section_id = ? AND ct.is_required = 1 AND ct.order_index < ?
      ORDER BY ct.order_index DESC
      LIMIT 1`,
    [userId, sectionId, orderIndex],
  );
  if (!rows.length) return true;
  return (rows[0].status || "not_started") === "completed";
}

/**
 * Проверяет, завершены ли все темы раздела пользователем.
 */
async function areAllTopicsCompletedBySection({ sectionId, userId }, options = {}) {
  const executor = options.connection || pool;
  const [[row]] = await executor.execute(
    `SELECT COUNT(*) AS total,
            COUNT(CASE WHEN ctup.status = 'completed' THEN 1 END) AS completed
       FROM course_topics ct
       LEFT JOIN course_topic_user_progress ctup ON ctup.topic_id = ct.id AND ctup.user_id = ?
      WHERE ct.section_id = ? AND ct.is_required = 1`,
    [userId, sectionId],
  );
  const total = Number(row?.total || 0);
  const completed = Number(row?.completed || 0);
  return { total, completed, allCompleted: total === 0 || total === completed };
}

// --- Результаты попыток ------------------------------------------------------

async function getSectionAttemptResult({ sectionId, userId, attemptId, connection }) {
  const [rows] = await connection.execute(
    `SELECT cs.id AS section_id, cs.course_id, cs.assessment_id,
            aa.id AS attempt_id, aa.attempt_number, aa.score_percent, a.pass_score_percent
       FROM course_sections cs
       JOIN assessment_attempts aa ON aa.assessment_id = cs.assessment_id
       JOIN assessments a ON a.id = aa.assessment_id
      WHERE cs.id = ? AND aa.id = ? AND aa.user_id = ? AND aa.status = 'completed' LIMIT 1`,
    [sectionId, attemptId, userId],
  );
  if (!rows.length) return null;
  const row = rows[0];
  const scorePercent = Number(row.score_percent || 0);
  const passScorePercent = Number(row.pass_score_percent || 0);
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
    `SELECT ct.id AS topic_id, ct.section_id, ct.course_id, ct.assessment_id,
            aa.id AS attempt_id, aa.attempt_number, aa.score_percent, a.pass_score_percent
       FROM course_topics ct
       JOIN assessment_attempts aa ON aa.assessment_id = ct.assessment_id
       JOIN assessments a ON a.id = aa.assessment_id
      WHERE ct.id = ? AND aa.id = ? AND aa.user_id = ? AND aa.status = 'completed' LIMIT 1`,
    [topicId, attemptId, userId],
  );
  if (!rows.length) return null;
  const row = rows[0];
  const scorePercent = Number(row.score_percent || 0);
  const passScorePercent = Number(row.pass_score_percent || 0);
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
    `SELECT c.id AS course_id, c.final_assessment_id,
            aa.id AS attempt_id, aa.attempt_number, aa.score_percent, a.pass_score_percent
       FROM courses c
       JOIN assessment_attempts aa ON aa.assessment_id = c.final_assessment_id
       JOIN assessments a ON a.id = aa.assessment_id
      WHERE c.id = ? AND aa.id = ? AND aa.user_id = ? AND aa.status = 'completed' LIMIT 1`,
    [courseId, attemptId, userId],
  );
  if (!rows.length) return null;
  const row = rows[0];
  const scorePercent = Number(row.score_percent || 0);
  const passScorePercent = Number(row.pass_score_percent || 0);
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

// --- Инициализация прогресса -------------------------------------------------

async function upsertCourseProgressOnStart({ courseId, userId, totalRequiredSectionsCount, connection }) {
  await connection.execute(
    `INSERT INTO course_user_progress
      (course_id, user_id, status, progress_percent, completed_modules_count, total_modules_count, started_at, last_activity_at, created_at, updated_at)
     VALUES (?, ?, 'in_progress', 0.00, 0, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       status = IF(status IN ('completed','closed'), status, 'in_progress'),
       total_modules_count = VALUES(total_modules_count),
       started_at = IF(started_at IS NULL, UTC_TIMESTAMP(), started_at),
       last_activity_at = UTC_TIMESTAMP(),
       updated_at = UTC_TIMESTAMP()`,
    [courseId, userId, totalRequiredSectionsCount],
  );
}

async function upsertSectionProgressOnStart(courseId, sectionId, userId, connection) {
  await connection.execute(
    `INSERT INTO course_section_user_progress
      (course_id, section_id, user_id, status, attempt_count, created_at, updated_at)
     VALUES (?, ?, ?, 'not_started', 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP()`,
    [courseId, sectionId, userId],
  );
}

async function upsertTopicProgressOnStart(topicId, sectionId, courseId, userId, connection) {
  await connection.execute(
    `INSERT INTO course_topic_user_progress
      (topic_id, section_id, course_id, user_id, status, material_viewed, attempt_count, started_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'not_started', 0, 0, NULL, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP()`,
    [topicId, sectionId, courseId, userId],
  );
}

async function insertCourseSnapshot(courseId, userId, version, snapshotJson, connection) {
  await connection.execute(
    `INSERT INTO course_user_snapshots
      (course_id, user_id, course_version, snapshot_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE updated_at = updated_at`,
    [courseId, userId, version, snapshotJson],
  );
}

// --- Обновление прогресса ----------------------------------------------------

async function upsertSectionProgress({ courseId, sectionId, userId, status, attemptId, scorePercent, attemptNumber, connection }) {
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
    [courseId, sectionId, userId, status, attemptId, scorePercent, attemptNumber, status],
  );
}

async function upsertTopicProgress({ topicId, sectionId, courseId, userId, status, attemptId, scorePercent, attemptNumber, connection }) {
  await connection.execute(
    `INSERT INTO course_topic_user_progress
      (topic_id, section_id, course_id, user_id, status, last_attempt_id, best_score_percent, attempt_count, started_at, completed_at, last_completed_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), IF(? = 'completed', UTC_TIMESTAMP(), NULL), NULL, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       last_attempt_id = VALUES(last_attempt_id),
       best_score_percent = GREATEST(IFNULL(best_score_percent, 0), VALUES(best_score_percent)),
       attempt_count = GREATEST(IFNULL(attempt_count, 0), VALUES(attempt_count)),
       started_at = IF(started_at IS NULL, UTC_TIMESTAMP(), started_at),
       completed_at = IF(VALUES(status) = 'completed', UTC_TIMESTAMP(), completed_at),
       updated_at = UTC_TIMESTAMP()`,
    [topicId, sectionId, courseId, userId, status, attemptId, scorePercent, attemptNumber, status],
  );
}

async function startTopicProgress({ topicId, sectionId, courseId, userId, connection }) {
  await connection.execute(
    `INSERT INTO course_topic_user_progress
      (topic_id, section_id, course_id, user_id, status, material_viewed, attempt_count, started_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'in_progress', 0, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       status = IF(status = 'not_started', 'in_progress', status),
       started_at = IF(started_at IS NULL, UTC_TIMESTAMP(), started_at),
       updated_at = UTC_TIMESTAMP()`,
    [topicId, sectionId, courseId, userId],
  );
}

async function getTopicProgressState({ topicId, userId, connection }) {
  const [rows] = await connection.execute(
    `SELECT status, material_viewed, started_at, completed_at
       FROM course_topic_user_progress
      WHERE topic_id = ? AND user_id = ?
      LIMIT 1`,
    [topicId, userId],
  );
  if (!rows.length) {
    return null;
  }
  const row = rows[0];
  return {
    status: row.status || "not_started",
    materialViewed: Boolean(row.material_viewed),
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  };
}

async function markTopicMaterial({ topicId, sectionId, courseId, userId, completedStatus, connection, topicOrderIndex = null }) {
  await connection.execute(
    `INSERT INTO course_topic_user_progress
      (topic_id, section_id, course_id, user_id, material_viewed, status, started_at, last_completed_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, UTC_TIMESTAMP(), ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       material_viewed = 1,
       status = IF(status IN ('completed','failed'), status, VALUES(status)),
       started_at = IF(started_at IS NULL, UTC_TIMESTAMP(), started_at),
       last_completed_order = IF(VALUES(status) = 'completed', VALUES(last_completed_order), last_completed_order),
       completed_at = IF(VALUES(status) = 'completed' AND completed_at IS NULL, UTC_TIMESTAMP(), completed_at),
       updated_at = UTC_TIMESTAMP()`,
    [topicId, sectionId, courseId, userId, completedStatus, topicOrderIndex],
  );
}

// --- Агрегация и синхронизация -----------------------------------------------

async function getCourseProgressAggregate({ courseId, userId, connection }) {
  const [[row]] = await connection.execute(
    `SELECT COUNT(CASE WHEN cs.is_required = 1 THEN 1 END) AS total,
            COUNT(CASE WHEN csup.status = 'passed' AND cs.is_required = 1 THEN 1 END) AS passed
       FROM course_sections cs
       LEFT JOIN course_section_user_progress csup ON csup.section_id = cs.id AND csup.user_id = ?
      WHERE cs.course_id = ?`,
    [userId, courseId],
  );
  const total = Number(row?.total || 0);
  const passed = Number(row?.passed || 0);
  return {
    totalRequiredSections: total,
    passedRequiredSections: passed,
    progressPercent: total > 0 ? Number(((passed / total) * 100).toFixed(2)) : 0,
  };
}

async function syncCourseProgress({ courseId, userId, aggregate, connection }) {
  const status = aggregate.passedRequiredSections > 0 ? "in_progress" : "not_started";
  await connection.execute(
    `INSERT INTO course_user_progress
      (course_id, user_id, status, progress_percent, completed_modules_count, total_modules_count, started_at, last_activity_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, IF(? = 'not_started', NULL, UTC_TIMESTAMP()), UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       status = IF(status IN ('completed','closed'), status, VALUES(status)),
       progress_percent = VALUES(progress_percent),
       completed_modules_count = VALUES(completed_modules_count),
       total_modules_count = VALUES(total_modules_count),
       started_at = IF(started_at IS NULL AND VALUES(status) <> 'not_started', UTC_TIMESTAMP(), started_at),
       last_activity_at = UTC_TIMESTAMP(),
       updated_at = UTC_TIMESTAMP()`,
    [courseId, userId, status, aggregate.progressPercent, aggregate.passedRequiredSections, aggregate.totalRequiredSections, status],
  );
}

async function completeCourseProgress({ courseId, userId, totalSections, connection }) {
  await connection.execute(
    `UPDATE course_user_progress
        SET status = 'completed', progress_percent = 100.00,
            completed_modules_count = ?, total_modules_count = ?,
            completed_at = UTC_TIMESTAMP(), last_activity_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
      WHERE course_id = ? AND user_id = ?`,
    [totalSections, totalSections, courseId, userId],
  );
}

async function getCourseProgressStatus({ courseId, userId, connection }) {
  const executor = connection || pool;
  const [rows] = await executor.execute(
    `SELECT status
       FROM course_user_progress
      WHERE course_id = ? AND user_id = ?
      LIMIT 1`,
    [courseId, userId],
  );
  return rows.length ? rows[0].status : null;
}

// --- Административные запросы прогресса -------------------------------------

async function getAdminUsersProgress(courseId) {
  const [rows] = await pool.execute(
    `SELECT cup.user_id, cup.status, cup.progress_percent,
            cup.started_at, cup.completed_at, cup.last_activity_at,
            cup.completed_modules_count, cup.total_modules_count,
            u.first_name, u.last_name, u.login,
            p.name AS position_title, b.name AS branch_title
       FROM course_user_progress cup
       JOIN users u ON u.id = cup.user_id
       LEFT JOIN positions p ON p.id = u.position_id
       LEFT JOIN branches b ON b.id = u.branch_id
      WHERE cup.course_id = ?
      ORDER BY cup.last_activity_at DESC`,
    [courseId],
  );
  return rows.map((r) => ({
    userId: Number(r.user_id),
    name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.login || `User #${r.user_id}`,
    login: r.login || null,
    positionTitle: r.position_title || null,
    branchTitle: r.branch_title || null,
    status: r.status,
    progressPercent: Number(r.progress_percent || 0),
    startedAt: r.started_at ? new Date(r.started_at).toISOString() : null,
    completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
    lastActivityAt: r.last_activity_at ? new Date(r.last_activity_at).toISOString() : null,
    completedSections: Number(r.completed_modules_count || 0),
    totalSections: Number(r.total_modules_count || 0),
  }));
}

async function getAdminUserDetailedProgress(courseId, userId) {
  const [[overallRow]] = await pool.execute(
    `SELECT cup.status, cup.progress_percent, cup.started_at, cup.completed_at
       FROM course_user_progress cup
      WHERE cup.course_id = ? AND cup.user_id = ? LIMIT 1`,
    [courseId, userId],
  );
  if (!overallRow) return null;

  const [sectionRows] = await pool.execute(
    `SELECT cs.id AS section_id, cs.title AS section_title, cs.order_index,
            cs.is_required, cs.assessment_id AS section_assessment_id,
            csup.status AS section_status, csup.best_score_percent AS section_score,
            csup.attempt_count AS section_attempts, csup.completed_at AS section_completed_at
       FROM course_sections cs
       LEFT JOIN course_section_user_progress csup ON csup.section_id = cs.id AND csup.user_id = ?
      WHERE cs.course_id = ?
      ORDER BY cs.order_index ASC`,
    [userId, courseId],
  );

  const [topicRows] = await pool.execute(
    `SELECT ct.id AS topic_id, ct.section_id, ct.title AS topic_title, ct.order_index,
            ct.is_required, ct.has_material, ct.assessment_id AS topic_assessment_id,
            ctup.status AS topic_status, ctup.material_viewed,
            ctup.best_score_percent AS topic_score, ctup.attempt_count AS topic_attempts,
            ctup.completed_at AS topic_completed_at
       FROM course_topics ct
       LEFT JOIN course_topic_user_progress ctup ON ctup.topic_id = ct.id AND ctup.user_id = ?
      WHERE ct.course_id = ?
      ORDER BY ct.section_id ASC, ct.order_index ASC`,
    [userId, courseId],
  );

  const topicsBySection = {};
  for (const t of topicRows) {
    const sid = Number(t.section_id);
    if (!topicsBySection[sid]) topicsBySection[sid] = [];
    topicsBySection[sid].push({
      topicId: Number(t.topic_id),
      title: t.topic_title,
      orderIndex: Number(t.order_index),
      isRequired: Boolean(t.is_required),
      hasMaterial: Boolean(t.has_material),
      hasAssessment: Boolean(t.topic_assessment_id),
      status: t.topic_status || "not_started",
      materialViewed: Boolean(t.material_viewed),
      scorePercent: t.topic_score !== null ? Number(t.topic_score) : null,
      attemptCount: Number(t.topic_attempts || 0),
      completedAt: t.topic_completed_at ? new Date(t.topic_completed_at).toISOString() : null,
    });
  }

  const sections = sectionRows.map((s) => ({
    sectionId: Number(s.section_id),
    title: s.section_title,
    orderIndex: Number(s.order_index),
    isRequired: Boolean(s.is_required),
    hasAssessment: Boolean(s.section_assessment_id),
    status: s.section_status || "not_started",
    scorePercent: s.section_score !== null ? Number(s.section_score) : null,
    attemptCount: Number(s.section_attempts || 0),
    completedAt: s.section_completed_at ? new Date(s.section_completed_at).toISOString() : null,
    topics: topicsBySection[Number(s.section_id)] || [],
  }));

  return {
    status: overallRow.status,
    progressPercent: Number(overallRow.progress_percent || 0),
    startedAt: overallRow.started_at ? new Date(overallRow.started_at).toISOString() : null,
    completedAt: overallRow.completed_at ? new Date(overallRow.completed_at).toISOString() : null,
    sections,
  };
}

async function resetUserProgressForCourse(courseId, userId, connection) {
  await connection.execute("DELETE FROM course_topic_user_progress WHERE course_id = ? AND user_id = ?", [courseId, userId]);
  await connection.execute("DELETE FROM course_section_user_progress WHERE course_id = ? AND user_id = ?", [courseId, userId]);
  await connection.execute("DELETE FROM course_user_progress WHERE course_id = ? AND user_id = ?", [courseId, userId]);
  await connection.execute("DELETE FROM course_user_snapshots WHERE course_id = ? AND user_id = ?", [courseId, userId]);
}

module.exports = {
  findSectionWithCourse,
  findTopicWithSection,
  isPreviousTopicCompleted,
  areAllTopicsCompletedBySection,
  getSectionAttemptResult,
  getTopicAttemptResult,
  getFinalAttemptResult,
  upsertCourseProgressOnStart,
  upsertSectionProgressOnStart,
  upsertTopicProgressOnStart,
  insertCourseSnapshot,
  upsertSectionProgress,
  upsertTopicProgress,
  startTopicProgress,
  getTopicProgressState,
  markTopicMaterial,
  getCourseProgressAggregate,
  syncCourseProgress,
  completeCourseProgress,
  getCourseProgressStatus,
  getAdminUsersProgress,
  getAdminUserDetailedProgress,
  resetUserProgressForCourse,
};
