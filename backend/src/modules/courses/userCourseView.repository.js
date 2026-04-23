const { pool } = require("../../config/database");
const { toIsoUtc, mapCourseRow, mapSectionRow, mapTopicRow } = require("./courses.mappers");
const { canAccessFinalAssessment } = require("./courses.repository");
const { listAssignedCourseIds } = require("./courseAssignments.repository");

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(baseDate, days) {
  if (!baseDate || !days) return null;
  const result = new Date(baseDate.getTime());
  result.setUTCDate(result.getUTCDate() + Number(days));
  return result;
}

function resolveAssignmentAndDeadline(row) {
  const assignedAtBase = parseDate(row.user_assigned_at) || parseDate(row.manual_assigned_at) || parseDate(row.published_at) || new Date();
  const persistedDeadline = parseDate(row.user_deadline_at) || parseDate(row.manual_deadline_at);

  if (persistedDeadline) {
    return {
      assignedAt: assignedAtBase,
      deadlineAt: persistedDeadline,
    };
  }

  if (row.availability_mode === "relative_days") {
    return {
      assignedAt: assignedAtBase,
      deadlineAt: addDays(assignedAtBase, row.availability_days),
    };
  }

  if (row.availability_mode === "fixed_dates") {
    return {
      assignedAt: assignedAtBase,
      deadlineAt: parseDate(row.availability_to),
    };
  }

  return {
    assignedAt: assignedAtBase,
    deadlineAt: null,
  };
}

function mapUserProgress(row, requiredTotalDefault) {
  const assignment = resolveAssignmentAndDeadline(row);
  return {
    status: row.user_status || "not_started",
    progressPercent: row.progress_percent != null ? Number(row.progress_percent) : 0,
    completedSectionsCount: row.completed_modules_count != null ? Number(row.completed_modules_count) : 0,
    totalSectionsCount: row.total_modules_count != null ? Number(row.total_modules_count) : Number(requiredTotalDefault || 0),
    startedAt: toIsoUtc(row.user_started_at),
    completedAt: toIsoUtc(row.user_completed_at),
    lastActivityAt: toIsoUtc(row.user_last_activity_at),
    assignedAt: assignment.assignedAt ? assignment.assignedAt.toISOString() : null,
    deadlineAt: assignment.deadlineAt ? assignment.deadlineAt.toISOString() : null,
  };
}

function resolveSectionLockReason({ isClosedForUser, isLockedBySequence }) {
  if (isClosedForUser) {
    return {
      lockReasonType: "course_closed",
      lockReasonText: "Курс закрыт администратором",
    };
  }

  if (isLockedBySequence) {
    return {
      lockReasonType: "sequence_blocked",
      lockReasonText: "Сначала завершите предыдущую обязательную тему курса",
    };
  }

  return {
    lockReasonType: null,
    lockReasonText: null,
  };
}

function resolveTopicLockReason({ isClosedForUser, isLockedBySectionSequence, isTopicRequired, previousRequiredTopic }) {
  if (isClosedForUser) {
    return {
      lockReasonType: "course_closed",
      lockReasonText: "Курс закрыт администратором",
    };
  }

  if (isLockedBySectionSequence) {
    return {
      lockReasonType: "section_sequence_blocked",
      lockReasonText: "Сначала завершите предыдущую обязательную тему курса",
    };
  }

  if (isTopicRequired && previousRequiredTopic && previousRequiredTopic.progress.status !== "completed") {
    return {
      lockReasonType: "topic_sequence_blocked",
      lockReasonText: "Сначала завершите предыдущую подтему",
    };
  }

  return {
    lockReasonType: null,
    lockReasonText: null,
  };
}

async function listPublishedCoursesForUser(userId, userPositionId, userBranchId) {
  const allowedIds = await listAssignedCourseIds(userId, userPositionId, userBranchId);
  const [closedRows] = await pool.execute(
    `SELECT course_id
       FROM course_user_progress
      WHERE user_id = ? AND status = 'closed'`,
    [userId],
  );
  for (const row of closedRows) {
    allowedIds.add(Number(row.course_id));
  }
  if (allowedIds.size === 0) return [];

  const idList = [...allowedIds].join(",");
  const [rows] = await pool.execute(
    `SELECT c.id, c.title, c.description, c.cover_url, c.category, c.tags, c.availability_mode, c.availability_days, c.availability_from, c.availability_to,
            c.status, c.version, c.final_assessment_id,
            c.created_by, c.updated_by, c.published_at, c.archived_at, c.created_at, c.updated_at,
            cup.status AS user_status, cup.progress_percent,
            cup.completed_modules_count, cup.total_modules_count,
            cup.started_at AS user_started_at, cup.completed_at AS user_completed_at,
            cup.last_activity_at AS user_last_activity_at, cup.assigned_at AS user_assigned_at, cup.deadline_at AS user_deadline_at,
            cua.assigned_at AS manual_assigned_at, cua.deadline_at AS manual_deadline_at,
            (SELECT COUNT(*) FROM course_sections cs WHERE cs.course_id = c.id) AS sections_count,
            (SELECT COUNT(*) FROM course_sections cs WHERE cs.course_id = c.id AND cs.is_required = 1) AS required_sections_count,
            (SELECT COUNT(*) FROM course_topics ct WHERE ct.course_id = c.id) AS topics_count,
            (SELECT COUNT(*) FROM course_sections cs WHERE cs.course_id = c.id AND cs.assessment_id IS NOT NULL) +
            (SELECT COUNT(*) FROM course_topics ct WHERE ct.course_id = c.id AND ct.assessment_id IS NOT NULL) AS tests_count
       FROM courses c
       LEFT JOIN course_user_progress cup ON cup.course_id = c.id AND cup.user_id = ?
       LEFT JOIN course_user_assignments cua ON cua.course_id = c.id AND cua.user_id = ?
      WHERE c.status = 'published' AND c.id IN (${idList})
      ORDER BY c.published_at DESC, c.id DESC`,
    [userId, userId],
  );

  return rows.map((row) => ({
    ...mapCourseRow(row),
    sectionsCount: Number(row.sections_count || 0),
    requiredSectionsCount: Number(row.required_sections_count || 0),
    topicsCount: Number(row.topics_count || 0),
    testsCount: Number(row.tests_count || 0),
    progress: mapUserProgress(row, row.required_sections_count),
  }));
}

async function getCourseProgressForUser(courseId, userId) {
  const [rows] = await pool.execute(
    `SELECT status AS user_status, progress_percent, completed_modules_count, total_modules_count,
            started_at AS user_started_at, completed_at AS user_completed_at, last_activity_at AS user_last_activity_at,
            assigned_at AS user_assigned_at, deadline_at AS user_deadline_at
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
      assignedAt: null,
      deadlineAt: null,
    };
  }
  return mapUserProgress(rows[0], 0);
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

async function getCourseForUser(courseId, userId, { positionId = null, branchId = null } = {}) {
  const allowedIds = await listAssignedCourseIds(userId, positionId, branchId);
  const [closedRows] = await pool.execute(
    `SELECT course_id
       FROM course_user_progress
      WHERE user_id = ? AND status = 'closed' AND course_id = ?`,
    [userId, courseId],
  );
  if (!allowedIds.has(Number(courseId)) && !closedRows.length) return null;

  const [courseRows] = await pool.execute(
    `SELECT c.id, c.title, c.description, c.cover_url, c.category, c.tags, c.availability_mode, c.availability_days, c.availability_from, c.availability_to,
            c.status, c.version, c.final_assessment_id,
            c.created_by, c.updated_by, c.published_at, c.archived_at, c.created_at, c.updated_at,
            cup.status AS user_status, cup.progress_percent,
            cup.completed_modules_count, cup.total_modules_count,
            cup.started_at AS user_started_at, cup.completed_at AS user_completed_at,
            cup.last_activity_at AS user_last_activity_at, cup.assigned_at AS user_assigned_at, cup.deadline_at AS user_deadline_at,
            cua.assigned_at AS manual_assigned_at, cua.deadline_at AS manual_deadline_at
       FROM courses c
       LEFT JOIN course_user_progress cup ON cup.course_id = c.id AND cup.user_id = ?
       LEFT JOIN course_user_assignments cua ON cua.course_id = c.id AND cua.user_id = ?
      WHERE c.id = ? AND c.status = 'published' LIMIT 1`,
    [userId, userId, courseId],
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
            ct.is_required, ct.has_material, ct.content, ct.assessment_id, ct.created_at, ct.updated_at,
            ctup.status AS user_topic_status, ctup.material_viewed,
            ctup.best_score_percent AS topic_best_score, ctup.attempt_count AS topic_attempt_count,
            ctup.last_attempt_id AS topic_last_attempt_id, ctup.started_at AS topic_started_at, ctup.completed_at AS topic_completed_at
       FROM course_topics ct
       LEFT JOIN course_topic_user_progress ctup ON ctup.topic_id = ct.id AND ctup.user_id = ?
      WHERE ct.course_id = ? ORDER BY ct.section_id ASC, ct.order_index ASC`,
    [userId, courseId],
  );

  const topicsBySectionId = {};
  for (const topicRow of topicRows) {
    const sectionId = Number(topicRow.section_id);
    if (!topicsBySectionId[sectionId]) topicsBySectionId[sectionId] = [];
    topicsBySectionId[sectionId].push({
      ...mapTopicRow(topicRow),
      progress: {
        status: topicRow.user_topic_status || "not_started",
        materialViewed: Boolean(topicRow.material_viewed),
        bestScorePercent: topicRow.topic_best_score != null ? Number(topicRow.topic_best_score) : null,
        attemptCount: topicRow.topic_attempt_count != null ? Number(topicRow.topic_attempt_count) : 0,
        lastAttemptId: topicRow.topic_last_attempt_id != null ? Number(topicRow.topic_last_attempt_id) : null,
        startedAt: toIsoUtc(topicRow.topic_started_at),
        completedAt: toIsoUtc(topicRow.topic_completed_at),
      },
    });
  }

  const isClosedForUser = (row.user_status || "not_started") === "closed";
  const sections = sectionRows.map((sectionRow, sectionIndex) => {
    const section = mapSectionRow(sectionRow);
    const prevRequired = sectionRows.slice(0, sectionIndex).filter((item) => Boolean(item.is_required));
    const isLockedBySequence = prevRequired.some((item) => (item.user_section_status || "not_started") !== "passed");
    const sectionLockReason = resolveSectionLockReason({
      isClosedForUser,
      isLockedBySequence,
    });

    const sectionTopics = topicsBySectionId[section.id] || [];
    let previousRequiredTopic = null;
    const topics = sectionTopics.map((topic) => {
      const topicLockReason = resolveTopicLockReason({
        isClosedForUser,
        isLockedBySectionSequence: isLockedBySequence,
        isTopicRequired: topic.isRequired,
        previousRequiredTopic,
      });
      if (topic.isRequired) {
        previousRequiredTopic = topic;
      }
      return {
        ...topic,
        progress: {
          ...topic.progress,
          locked: Boolean(topicLockReason.lockReasonType),
          lockReasonType: topicLockReason.lockReasonType,
          lockReasonText: topicLockReason.lockReasonText,
        },
      };
    });

    const requiredTopics = topics.filter((item) => item.isRequired);
    const allTopicsCompleted = requiredTopics.length === 0 || requiredTopics.every((item) => item.progress.status === "completed");
    return {
      ...section,
      progress: {
        status: sectionRow.user_section_status || "not_started",
        bestScorePercent: sectionRow.section_best_score != null ? Number(sectionRow.section_best_score) : null,
        attemptCount: sectionRow.section_attempt_count != null ? Number(sectionRow.section_attempt_count) : 0,
        lastAttemptId: sectionRow.section_last_attempt_id != null ? Number(sectionRow.section_last_attempt_id) : null,
        startedAt: toIsoUtc(sectionRow.section_started_at),
        completedAt: toIsoUtc(sectionRow.section_completed_at),
        locked: Boolean(sectionLockReason.lockReasonType),
        lockReasonType: sectionLockReason.lockReasonType,
        lockReasonText: sectionLockReason.lockReasonText,
        allTopicsCompleted,
        sectionTestAvailable: !isClosedForUser && !isLockedBySequence && allTopicsCompleted && !!section.assessmentId,
      },
      topics,
    };
  });

  const [finalAccess, snapshot] = await Promise.all([canAccessFinalAssessment({ courseId, userId }), getCourseSnapshot(courseId, userId)]);

  return {
    ...course,
    testsCount: sectionRows.filter((item) => item.assessment_id != null).length + topicRows.filter((item) => item.assessment_id != null).length,
    progress: mapUserProgress(row, sections.filter((item) => item.isRequired).length),
    sections,
    finalAssessment: {
      id: course.finalAssessmentId,
      available: !isClosedForUser && finalAccess.allowed,
      reason: isClosedForUser ? "COURSE_CLOSED_BY_ADMIN" : finalAccess.allowed ? null : finalAccess.reason,
      passedRequiredSections: finalAccess.passedRequiredSections || 0,
      totalRequiredSections: finalAccess.totalRequiredSections || sections.filter((item) => item.isRequired).length,
    },
    snapshot,
  };
}

async function getCourseSectionForUser(courseId, sectionId, userId, userContext = {}) {
  const course = await getCourseForUser(courseId, userId, userContext);
  if (!course) return null;

  const section = course.sections.find((item) => item.id === Number(sectionId)) || null;
  if (!section) return null;

  return {
    section,
    course: {
      id: course.id,
      title: course.title,
      progress: course.progress,
    },
  };
}

module.exports = {
  listPublishedCoursesForUser,
  getCourseProgressForUser,
  getCourseSnapshot,
  getCourseForUser,
  getCourseSectionForUser,
};
