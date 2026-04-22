const test = require("node:test");
const assert = require("node:assert/strict");

const { pool } = require("../../src/config/database");
const analyticsRepo = require("../../src/modules/courses/courseAnalytics.repository");

test("аналитика воронки: возвращает расширенные метрики курса", async () => {
  const originalExecute = pool.execute;
  const originalQuery = pool.query;
  pool.query = async () => [
    [
      { table_name: "course_sections" },
      { table_name: "course_section_user_progress" },
    ],
  ];
  pool.execute = async () => [
    [
      {
        course_id: 7,
        course_title: "Курс А",
        assigned_count: 12,
        enrolled_count: 10,
        started_count: 8,
        in_progress_count: 3,
        completed_count: 5,
        avg_progress: 71.25,
        course_attempts_count: 19,
        final_attempts_count: 7,
        avg_course_score: 79.66,
        avg_final_score: 73.04,
        total_time_spent_seconds: 5412,
      },
    ],
  ];

  try {
    const rows = await analyticsRepo.getCourseFunnelStats();
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], {
      courseId: 7,
      courseTitle: "Курс А",
      assignedCount: 12,
      enrolledCount: 10,
      startedCount: 8,
      inProgressCount: 3,
      completedCount: 5,
      avgProgress: 71.3,
      sectionTestsAttemptsCount: 19,
      finalAssessmentAttemptsCount: 7,
      avgCourseScore: 79.7,
      avgFinalScore: 73,
      totalTimeSpentSeconds: 5412,
    });
  } finally {
    pool.execute = originalExecute;
    pool.query = originalQuery;
  }
});

test("отчет прогресса: агрегирует summary по пользователям", async () => {
  const originalExecute = pool.execute;
  const originalQuery = pool.query;
  pool.query = async () => [
    [
      { table_name: "course_sections" },
      { table_name: "course_section_user_progress" },
    ],
  ];
  pool.execute = async () => [
    [
      {
        user_id: 101,
        status: "completed",
        progress_percent: 100,
        started_at: "2026-04-10 10:00:00",
        completed_at: "2026-04-11 10:00:00",
        last_activity_at: "2026-04-11 10:00:00",
        completed_modules_count: 4,
        total_modules_count: 4,
        first_name: "Анна",
        last_name: "Петрова",
        login: "anna",
        position_title: "Кассир",
        branch_title: "Центр",
        section_attempts_count: 3,
        avg_section_score: 85.2,
        section_time_seconds: 1200,
        final_attempts_count: 1,
        avg_final_score: 78.5,
        final_time_seconds: 400,
      },
      {
        user_id: 102,
        status: "in_progress",
        progress_percent: 50,
        started_at: "2026-04-12 10:00:00",
        completed_at: null,
        last_activity_at: "2026-04-12 12:00:00",
        completed_modules_count: 2,
        total_modules_count: 4,
        first_name: "Игорь",
        last_name: "Смирнов",
        login: "igor",
        position_title: "Повар",
        branch_title: "Север",
        section_attempts_count: 2,
        avg_section_score: 72.4,
        section_time_seconds: 900,
        final_attempts_count: 0,
        avg_final_score: 0,
        final_time_seconds: 0,
      },
    ],
  ];

  try {
    const report = await analyticsRepo.getCourseProgressReport(1);
    assert.equal(report.users.length, 2);
    assert.deepEqual(report.summary, {
      totalUsers: 2,
      startedCount: 2,
      inProgressCount: 1,
      completedCount: 1,
      avgProgress: 75,
      sectionTestsAttemptsCount: 5,
      finalAssessmentAttemptsCount: 1,
      totalTimeSpentSeconds: 2500,
      avgCourseScore: 78.8,
      avgFinalScore: 78.5,
    });
  } finally {
    pool.execute = originalExecute;
    pool.query = originalQuery;
  }
});
