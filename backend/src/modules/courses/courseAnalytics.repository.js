const { pool } = require("../../config/database");

let schemaValidationPromise = null;

async function ensureCourseAnalyticsSchema() {
  if (schemaValidationPromise) {
    return schemaValidationPromise;
  }

  schemaValidationPromise = pool
    .query(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name IN ('course_sections', 'course_section_user_progress')`,
    )
    .then(([rows]) => {
      const existingTables = new Set(rows.map((row) => row.table_name));
      const missingTables = [];
      if (!existingTables.has("course_sections")) missingTables.push("course_sections");
      if (!existingTables.has("course_section_user_progress")) missingTables.push("course_section_user_progress");

      if (missingTables.length > 0) {
        const error = new Error(
          `Схема модуля курсов неактуальна. Отсутствуют таблицы: ${missingTables.join(", ")}. Примените миграции БД.`,
        );
        error.status = 500;
        throw error;
      }
    })
    .catch((error) => {
      schemaValidationPromise = null;
      throw error;
    });

  return schemaValidationPromise;
}

async function getCourseFunnelStats() {
  await ensureCourseAnalyticsSchema();
  const [rows] = await pool.execute(
    `SELECT c.id AS course_id, c.title AS course_title,
            COALESCE(assigned.assigned_count, 0) AS assigned_count,
            COUNT(cup.user_id) AS enrolled_count,
            SUM(CASE WHEN cup.started_at IS NOT NULL OR cup.status IN ('in_progress', 'completed') THEN 1 ELSE 0 END) AS started_count,
            SUM(CASE WHEN cup.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_count,
            SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
            AVG(cup.progress_percent) AS avg_progress,
            COALESCE(course_attempts.course_attempts_count, 0) AS course_attempts_count,
            COALESCE(final_attempts.final_attempts_count, 0) AS final_attempts_count,
            COALESCE(course_attempts.avg_course_score, 0) AS avg_course_score,
            COALESCE(final_attempts.avg_final_score, 0) AS avg_final_score,
            COALESCE(course_attempts.course_time_seconds, 0) + COALESCE(final_attempts.final_time_seconds, 0) AS total_time_spent_seconds
       FROM courses c
       LEFT JOIN course_user_progress cup ON cup.course_id = c.id
       LEFT JOIN (
         SELECT cua.course_id, COUNT(*) AS assigned_count
           FROM course_user_assignments cua
          WHERE cua.status = 'active'
          GROUP BY cua.course_id
       ) assigned ON assigned.course_id = c.id
       LEFT JOIN (
         SELECT cs.course_id,
                COUNT(*) AS course_attempts_count,
                AVG(aa.score_percent) AS avg_course_score,
                COALESCE(SUM(aa.time_spent_seconds), 0) AS course_time_seconds
           FROM course_sections cs
           JOIN assessment_attempts aa ON aa.assessment_id = cs.assessment_id AND aa.status = 'completed'
          WHERE cs.assessment_id IS NOT NULL
          GROUP BY cs.course_id
       ) course_attempts ON course_attempts.course_id = c.id
       LEFT JOIN (
         SELECT c2.id AS course_id,
                COUNT(*) AS final_attempts_count,
                AVG(aa.score_percent) AS avg_final_score,
                COALESCE(SUM(aa.time_spent_seconds), 0) AS final_time_seconds
           FROM courses c2
           JOIN assessment_attempts aa ON aa.assessment_id = c2.final_assessment_id AND aa.status = 'completed'
          WHERE c2.final_assessment_id IS NOT NULL
          GROUP BY c2.id
       ) final_attempts ON final_attempts.course_id = c.id
      WHERE c.status = 'published'
      GROUP BY c.id, c.title, assigned.assigned_count, course_attempts.course_attempts_count, course_attempts.avg_course_score,
               course_attempts.course_time_seconds, final_attempts.final_attempts_count, final_attempts.avg_final_score, final_attempts.final_time_seconds
      ORDER BY assigned_count DESC, enrolled_count DESC, c.title ASC`,
  );

  return rows.map((row) => ({
    courseId: Number(row.course_id),
    courseTitle: row.course_title,
    assignedCount: Number(row.assigned_count || 0),
    enrolledCount: Number(row.enrolled_count || 0),
    startedCount: Number(row.started_count || 0),
    inProgressCount: Number(row.in_progress_count || 0),
    completedCount: Number(row.completed_count || 0),
    avgProgress: row.avg_progress !== null ? Number(Number(row.avg_progress).toFixed(1)) : 0,
    sectionTestsAttemptsCount: Number(row.course_attempts_count || 0),
    finalAssessmentAttemptsCount: Number(row.final_attempts_count || 0),
    avgCourseScore: row.avg_course_score !== null ? Number(Number(row.avg_course_score).toFixed(1)) : 0,
    avgFinalScore: row.avg_final_score !== null ? Number(Number(row.avg_final_score).toFixed(1)) : 0,
    totalTimeSpentSeconds: Number(row.total_time_spent_seconds || 0),
  }));
}

async function getSectionFailureStats(courseId) {
  await ensureCourseAnalyticsSchema();
  const [rows] = await pool.execute(
    `SELECT cs.id AS section_id, cs.title AS section_title, cs.order_index,
            COUNT(csup.user_id) AS total_attempts,
            SUM(CASE WHEN csup.status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
            SUM(CASE WHEN csup.status = 'passed' THEN 1 ELSE 0 END) AS passed_count,
            AVG(csup.score_percent) AS avg_score
       FROM course_sections cs
       LEFT JOIN course_section_user_progress csup ON csup.section_id = cs.id
      WHERE cs.course_id = ?
      GROUP BY cs.id, cs.title, cs.order_index
      ORDER BY cs.order_index ASC`,
    [courseId],
  );

  return rows.map((row) => ({
    sectionId: Number(row.section_id),
    sectionTitle: row.section_title,
    orderIndex: Number(row.order_index),
    totalAttempts: Number(row.total_attempts || 0),
    failedCount: Number(row.failed_count || 0),
    passedCount: Number(row.passed_count || 0),
    avgScore: row.avg_score !== null ? Number(Number(row.avg_score).toFixed(1)) : null,
  }));
}

async function getCourseProgressReport(courseId) {
  await ensureCourseAnalyticsSchema();
  const [rows] = await pool.execute(
    `SELECT cup.user_id, cup.status, cup.progress_percent, cup.started_at, cup.completed_at, cup.last_activity_at,
            cup.completed_modules_count, cup.total_modules_count,
            u.first_name, u.last_name, u.login,
            p.name AS position_title, b.name AS branch_title,
            COALESCE(section_metrics.section_attempts_count, 0) AS section_attempts_count,
            COALESCE(section_metrics.avg_section_score, 0) AS avg_section_score,
            COALESCE(section_metrics.section_time_seconds, 0) AS section_time_seconds,
            COALESCE(final_metrics.final_attempts_count, 0) AS final_attempts_count,
            COALESCE(final_metrics.avg_final_score, 0) AS avg_final_score,
            COALESCE(final_metrics.final_time_seconds, 0) AS final_time_seconds
       FROM course_user_progress cup
       JOIN users u ON u.id = cup.user_id
       LEFT JOIN positions p ON p.id = u.position_id
       LEFT JOIN branches b ON b.id = u.branch_id
       LEFT JOIN (
         SELECT cs.course_id, aa.user_id,
                COUNT(*) AS section_attempts_count,
                AVG(aa.score_percent) AS avg_section_score,
                COALESCE(SUM(aa.time_spent_seconds), 0) AS section_time_seconds
           FROM course_sections cs
           JOIN assessment_attempts aa ON aa.assessment_id = cs.assessment_id AND aa.status = 'completed'
          WHERE cs.assessment_id IS NOT NULL
          GROUP BY cs.course_id, aa.user_id
       ) section_metrics ON section_metrics.course_id = cup.course_id AND section_metrics.user_id = cup.user_id
       LEFT JOIN (
         SELECT c.id AS course_id, aa.user_id,
                COUNT(*) AS final_attempts_count,
                AVG(aa.score_percent) AS avg_final_score,
                COALESCE(SUM(aa.time_spent_seconds), 0) AS final_time_seconds
           FROM courses c
           JOIN assessment_attempts aa ON aa.assessment_id = c.final_assessment_id AND aa.status = 'completed'
          WHERE c.final_assessment_id IS NOT NULL
          GROUP BY c.id, aa.user_id
       ) final_metrics ON final_metrics.course_id = cup.course_id AND final_metrics.user_id = cup.user_id
      WHERE cup.course_id = ?
      ORDER BY cup.last_activity_at DESC`,
    [courseId],
  );

  const users = rows.map((row) => ({
    userId: Number(row.user_id),
    name: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.login || `User #${row.user_id}`,
    login: row.login || null,
    positionTitle: row.position_title || null,
    branchTitle: row.branch_title || null,
    status: row.status,
    progressPercent: Number(row.progress_percent || 0),
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at).toISOString() : null,
    completedSections: Number(row.completed_modules_count || 0),
    totalSections: Number(row.total_modules_count || 0),
    sectionTestsAttemptsCount: Number(row.section_attempts_count || 0),
    finalAssessmentAttemptsCount: Number(row.final_attempts_count || 0),
    avgCourseScore: Number(Number(row.avg_section_score || 0).toFixed(1)),
    avgFinalScore: Number(Number(row.avg_final_score || 0).toFixed(1)),
    totalTimeSpentSeconds: Number(row.section_time_seconds || 0) + Number(row.final_time_seconds || 0),
  }));

  const summary = users.reduce(
    (acc, user) => {
      acc.totalUsers += 1;
      acc.startedCount += user.startedAt ? 1 : 0;
      acc.inProgressCount += user.status === "in_progress" ? 1 : 0;
      acc.completedCount += user.status === "completed" ? 1 : 0;
      acc.avgProgress += user.progressPercent;
      acc.sectionTestsAttemptsCount += user.sectionTestsAttemptsCount;
      acc.finalAssessmentAttemptsCount += user.finalAssessmentAttemptsCount;
      acc.totalTimeSpentSeconds += user.totalTimeSpentSeconds;
      if (user.avgCourseScore > 0) {
        acc.avgCourseScoreSum += user.avgCourseScore;
        acc.avgCourseScoreCount += 1;
      }
      if (user.avgFinalScore > 0) {
        acc.avgFinalScoreSum += user.avgFinalScore;
        acc.avgFinalScoreCount += 1;
      }
      return acc;
    },
    {
      totalUsers: 0,
      startedCount: 0,
      inProgressCount: 0,
      completedCount: 0,
      avgProgress: 0,
      sectionTestsAttemptsCount: 0,
      finalAssessmentAttemptsCount: 0,
      totalTimeSpentSeconds: 0,
      avgCourseScoreSum: 0,
      avgCourseScoreCount: 0,
      avgFinalScoreSum: 0,
      avgFinalScoreCount: 0,
    },
  );

  return {
    summary: {
      totalUsers: summary.totalUsers,
      startedCount: summary.startedCount,
      inProgressCount: summary.inProgressCount,
      completedCount: summary.completedCount,
      avgProgress: summary.totalUsers ? Number((summary.avgProgress / summary.totalUsers).toFixed(1)) : 0,
      sectionTestsAttemptsCount: summary.sectionTestsAttemptsCount,
      finalAssessmentAttemptsCount: summary.finalAssessmentAttemptsCount,
      totalTimeSpentSeconds: summary.totalTimeSpentSeconds,
      avgCourseScore: summary.avgCourseScoreCount ? Number((summary.avgCourseScoreSum / summary.avgCourseScoreCount).toFixed(1)) : 0,
      avgFinalScore: summary.avgFinalScoreCount ? Number((summary.avgFinalScoreSum / summary.avgFinalScoreCount).toFixed(1)) : 0,
    },
    users,
  };
}

module.exports = {
  getCourseFunnelStats,
  getSectionFailureStats,
  getCourseProgressReport,
};
