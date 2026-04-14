const { pool } = require("../../config/database");
const { toIsoUtc, mapCourseRow, mapSectionRow, mapTopicRow } = require("./courses.mappers");
const { canAccessFinalAssessment } = require("./courses.repository");
const { listAssignedCourseIds } = require("./courseAssignments.repository");

async function listPublishedCoursesForUser(userId, userPositionId, userBranchId) {
  // Получаем множество ID курсов, доступных этому пользователю
  const allowedIds = await listAssignedCourseIds(userId, userPositionId, userBranchId);
  if (allowedIds.size === 0) {
    return [];
  }

  const idList = [...allowedIds].join(",");
  const [rows] = await pool.execute(
    `SELECT c.id, c.title, c.description, c.status, c.version, c.final_assessment_id,
            c.created_by, c.updated_by, c.published_at, c.archived_at, c.created_at, c.updated_at,
            cup.status AS user_status, cup.progress_percent,
            cup.completed_modules_count, cup.total_modules_count,
            cup.started_at AS user_started_at, cup.completed_at AS user_completed_at,
            cup.last_activity_at AS user_last_activity_at,
            (SELECT COUNT(*) FROM course_sections cs WHERE cs.course_id = c.id) AS sections_count,
            (SELECT COUNT(*) FROM course_sections cs WHERE cs.course_id = c.id AND cs.is_required = 1) AS required_sections_count
       FROM courses c
       LEFT JOIN course_user_progress cup ON cup.course_id = c.id AND cup.user_id = ?
      WHERE c.status = 'published' AND c.id IN (${idList})
      ORDER BY c.published_at DESC, c.id DESC`,
    [userId],
  );
  return rows.map((row) => ({
    ...mapCourseRow(row),
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
  }));
}

async function getCourseProgressForUser(courseId, userId) {
  const [rows] = await pool.execute(
    `SELECT status, progress_percent, completed_modules_count, total_modules_count,
            started_at, completed_at, last_activity_at
       FROM course_user_progress WHERE course_id = ? AND user_id = ? LIMIT 1`,
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

async function getCourseSnapshot(courseId, userId) {
  const [rows] = await pool.execute(
    `SELECT course_version, snapshot_json, created_at
       FROM course_user_snapshots WHERE course_id = ? AND user_id = ? LIMIT 1`,
    [courseId, userId],
  );
  if (!rows.length) return null;
  const row = rows[0];
  let snapshot = null;
  try {
    snapshot = typeof row.snapshot_json === "string" ? JSON.parse(row.snapshot_json) : row.snapshot_json;
  } catch {}
  return { courseVersion: Number(row.course_version || 0), snapshot, createdAt: toIsoUtc(row.created_at) };
}

async function getCourseForUser(courseId, userId) {
  const [courseRows] = await pool.execute(
    `SELECT c.id, c.title, c.description, c.status, c.version, c.final_assessment_id,
            c.created_by, c.updated_by, c.published_at, c.archived_at, c.created_at, c.updated_at,
            cup.status AS user_status, cup.progress_percent,
            cup.completed_modules_count, cup.total_modules_count,
            cup.started_at AS user_started_at, cup.completed_at AS user_completed_at,
            cup.last_activity_at AS user_last_activity_at
       FROM courses c
       LEFT JOIN course_user_progress cup ON cup.course_id = c.id AND cup.user_id = ?
      WHERE c.id = ? AND c.status = 'published' LIMIT 1`,
    [userId, courseId],
  );
  if (!courseRows.length) return null;

  const row = courseRows[0];
  const course = mapCourseRow(row);

  const [sectionRows] = await pool.execute(
    `SELECT cs.id, cs.course_id, cs.title, cs.description, cs.order_index,
            cs.assessment_id, cs.is_required, cs.estimated_minutes, cs.created_at, cs.updated_at,
            csup.status AS user_section_status, csup.best_score_percent AS section_best_score,
            csup.attempt_count AS section_attempt_count, csup.last_attempt_id AS section_last_attempt_id,
            csup.started_at AS section_started_at, csup.completed_at AS section_completed_at
       FROM course_sections cs
       LEFT JOIN course_section_user_progress csup ON csup.section_id = cs.id AND csup.user_id = ?
      WHERE cs.course_id = ? ORDER BY cs.order_index ASC`,
    [userId, courseId],
  );

  const [topicRows] = await pool.execute(
    `SELECT ct.id, ct.section_id, ct.course_id, ct.title, ct.order_index,
            ct.has_material, ct.content, ct.assessment_id, ct.created_at, ct.updated_at,
            ctup.status AS user_topic_status, ctup.material_viewed,
            ctup.best_score_percent AS topic_best_score, ctup.attempt_count AS topic_attempt_count,
            ctup.last_attempt_id AS topic_last_attempt_id, ctup.completed_at AS topic_completed_at
       FROM course_topics ct
       LEFT JOIN course_topic_user_progress ctup ON ctup.topic_id = ct.id AND ctup.user_id = ?
      WHERE ct.course_id = ? ORDER BY ct.section_id ASC, ct.order_index ASC`,
    [userId, courseId],
  );

  const topicsBySectionId = {};
  for (const topicRow of topicRows) {
    const sId = Number(topicRow.section_id);
    if (!topicsBySectionId[sId]) topicsBySectionId[sId] = [];
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

  const sections = sectionRows.map((sectionRow, sectionIndex) => {
    const section = mapSectionRow(sectionRow);
    const prevRequired = sectionRows.slice(0, sectionIndex).filter((s) => Boolean(s.is_required));
    const isLocked = prevRequired.some((s) => (s.user_section_status || "not_started") !== "passed");

    const topics = (topicsBySectionId[section.id] || []).map((topic, topicIndex) => {
      const prevTopic = (topicsBySectionId[section.id] || [])[topicIndex - 1];
      return { ...topic, progress: { ...topic.progress, locked: isLocked || (!!prevTopic && prevTopic.progress.status !== "completed") } };
    });

    // Если в разделе нет тем — считаем «все темы выполнены» (раздел открыт только для теста)
    const allTopicsCompleted = topics.length === 0 || topics.every((t) => t.progress.status === "completed");
    return {
      ...section,
      progress: {
        status: sectionRow.user_section_status || "not_started",
        bestScorePercent: sectionRow.section_best_score != null ? Number(sectionRow.section_best_score) : null,
        attemptCount: sectionRow.section_attempt_count != null ? Number(sectionRow.section_attempt_count) : 0,
        lastAttemptId: sectionRow.section_last_attempt_id != null ? Number(sectionRow.section_last_attempt_id) : null,
        startedAt: toIsoUtc(sectionRow.section_started_at),
        completedAt: toIsoUtc(sectionRow.section_completed_at),
        locked: isLocked,
        allTopicsCompleted,
        sectionTestAvailable: !isLocked && allTopicsCompleted && !!section.assessmentId,
      },
      topics,
    };
  });

  const [finalAccess, snapshot] = await Promise.all([canAccessFinalAssessment({ courseId, userId }), getCourseSnapshot(courseId, userId)]);

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

module.exports = {
  listPublishedCoursesForUser,
  getCourseProgressForUser,
  getCourseSnapshot,
  getCourseForUser,
};
