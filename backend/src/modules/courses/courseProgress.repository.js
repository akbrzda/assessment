/**
 * SQL-операции для отслеживания прогресса пользователей по курсам.
 * Все функции принимают управляемый connection — транзакции на уровне сервиса.
 */

// ─── Поиск с контекстом ─────────────────────────────────────────────────────

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
    `SELECT ct.id, ct.section_id, ct.course_id, ct.assessment_id, ct.has_material,
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
    hasMaterial: Boolean(row.has_material),
    sectionAssessmentId: row.section_assessment_id ? Number(row.section_assessment_id) : null,
    courseStatus: row.course_status,
  };
}

// ─── Результаты попыток ──────────────────────────────────────────────────────

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

// ─── Инициализация прогресса ─────────────────────────────────────────────────

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
      (topic_id, section_id, course_id, user_id, status, material_viewed, attempt_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'not_started', 0, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())
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

// ─── Обновление прогресса ────────────────────────────────────────────────────

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
      (topic_id, section_id, course_id, user_id, status, last_attempt_id, best_score_percent, attempt_count, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, IF(? = 'completed', UTC_TIMESTAMP(), NULL), UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       last_attempt_id = VALUES(last_attempt_id),
       best_score_percent = GREATEST(IFNULL(best_score_percent, 0), VALUES(best_score_percent)),
       attempt_count = GREATEST(IFNULL(attempt_count, 0), VALUES(attempt_count)),
       completed_at = IF(VALUES(status) = 'completed', UTC_TIMESTAMP(), completed_at),
       updated_at = UTC_TIMESTAMP()`,
    [topicId, sectionId, courseId, userId, status, attemptId, scorePercent, attemptNumber, status],
  );
}

async function markTopicMaterial({ topicId, sectionId, courseId, userId, completedStatus, connection }) {
  await connection.execute(
    `INSERT INTO course_topic_user_progress
      (topic_id, section_id, course_id, user_id, material_viewed, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       material_viewed = 1,
       status = IF(status IN ('completed','failed'), status, VALUES(status)),
       completed_at = IF(VALUES(status) = 'completed' AND completed_at IS NULL, UTC_TIMESTAMP(), completed_at),
       updated_at = UTC_TIMESTAMP()`,
    [topicId, sectionId, courseId, userId, completedStatus],
  );
}

// ─── Агрегация и синхронизация ───────────────────────────────────────────────

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
       status = IF(status = 'completed', status, VALUES(status)),
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

module.exports = {
  findSectionWithCourse,
  findTopicWithSection,
  getSectionAttemptResult,
  getTopicAttemptResult,
  getFinalAttemptResult,
  upsertCourseProgressOnStart,
  upsertSectionProgressOnStart,
  upsertTopicProgressOnStart,
  insertCourseSnapshot,
  upsertSectionProgress,
  upsertTopicProgress,
  markTopicMaterial,
  getCourseProgressAggregate,
  syncCourseProgress,
  completeCourseProgress,
};
