const { pool } = require("../config/database");

function normalizeDate(value, fallback) {
  if (!value) {
    return fallback || null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback || null : new Date(date.toISOString().slice(0, 19));
}

function buildUserFilters({ branchId, positionId, managerBranchId }) {
  const clauses = [];
  const params = [];
  if (branchId) {
    clauses.push("u.branch_id = ?");
    params.push(branchId);
  } else if (managerBranchId) {
    clauses.push("u.branch_id = ?");
    params.push(managerBranchId);
  }
  if (positionId) {
    clauses.push("u.position_id = ?");
    params.push(positionId);
  }
  return { clauses, params };
}

function buildDateFilters({ from, to }, field) {
  const clauses = [];
  const params = [];
  if (from) {
    clauses.push(`${field} >= ?`);
    params.push(from);
  }
  if (to) {
    clauses.push(`${field} <= ?`);
    params.push(to);
  }
  return { clauses, params };
}

async function getSummary({ from = null, to = null, branchId = null, positionId = null, managerBranchId = null }) {
  // Для попыток применяем фильтры по пользователям (филиал/должность)
  const attemptFilter = buildUserFilters({ branchId, positionId, managerBranchId });
  const dateFilter = buildDateFilters({ from, to }, "aa.completed_at");

  const attemptConditions = ['aa.status = "completed"', ...attemptFilter.clauses, ...dateFilter.clauses];
  const attemptParams = [...attemptFilter.params, ...dateFilter.params];

  const [attemptRows] = await pool.execute(
    `SELECT
       COUNT(*) AS completedAttempts,
       COUNT(DISTINCT aa.assessment_id) AS distinctAssessments,
       AVG(aa.score_percent) AS averageScore,
       AVG(NULLIF(aa.time_spent_seconds, 0)) AS averageTime,
       SUM(CASE WHEN aa.score_percent IS NOT NULL AND aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) AS passedAttempts
     FROM assessment_attempts aa
     JOIN assessments a ON a.id = aa.assessment_id
     JOIN users u ON u.id = aa.user_id
     WHERE ${attemptConditions.join(" AND ") || "1=1"}`,
    attemptParams
  );

  // Подсчёт ВСЕХ аттестаций (без фильтра по филиалу для управляющего)
  const assessmentDateFilter = buildDateFilters({ from, to }, "created_at");
  const assessmentConditions = assessmentDateFilter.clauses;
  const assessmentParams = assessmentDateFilter.params;

  const [assessmentCountRows] = await pool.execute(
    `SELECT COUNT(*) AS total_assessments
     FROM assessments
     ${assessmentConditions.length ? `WHERE ${assessmentConditions.join(" AND ")}` : ""}`,
    assessmentParams
  );

  // Подсчёт пользователей с учётом фильтра по филиалу (для управляющего)
  const userFilter = buildUserFilters({ branchId, positionId, managerBranchId });
  const userConditions = userFilter.clauses;
  const userParams = userFilter.params;

  const [userCountRows] = await pool.execute(
    `SELECT COUNT(*) AS total_users
     FROM users u
     ${userConditions.length ? `WHERE ${userConditions.join(" AND ")}` : ""}`,
    userParams
  );

  // Подсчёт активных аттестаций (открытые в данный момент)
  const now = new Date();
  const nowIso = now.toISOString().slice(0, 19).replace("T", " ");

  const [activeRows] = await pool.execute(
    `SELECT COUNT(*) AS active_assessments
     FROM assessments a
     WHERE a.open_at <= ? AND a.close_at >= ?`,
    [nowIso, nowIso]
  );

  const attempts = attemptRows[0] || {};
  const assessmentCount = assessmentCountRows[0] || {};
  const userCount = userCountRows[0] || {};
  const active = activeRows[0] || {};

  const completedAttempts = Number(attempts.completedAttempts || 0);
  const passedAttempts = Number(attempts.passedAttempts || 0);
  const passRate = completedAttempts ? Math.round((passedAttempts / completedAttempts) * 100) : 0;

  console.log("[getSummary] Статистика:", {
    totalUsers: userCount.total_users,
    totalAssessments: assessmentCount.total_assessments,
    completedAttempts,
    averageScore: attempts.averageScore,
  });

  return {
    totalAssessments: Number(assessmentCount.total_assessments || 0),
    distinctAssessments: Number(attempts.distinctAssessments || 0),
    activeAssessments: Number(active.active_assessments || 0),
    completedAttempts,
    passRate,
    averageScore: attempts.averageScore != null ? Number(attempts.averageScore) : null,
    averageTimeSeconds: attempts.averageTime != null ? Number(attempts.averageTime) : null,
    assignedUsers: Number(userCount.total_users || 0), // Общее количество пользователей (с учётом фильтра)
    totalUsers: Number(userCount.total_users || 0), // Добавляем для совместимости
  };
}

async function getBranchBreakdown({ from = null, to = null, branchId = null, positionId = null, managerBranchId = null }) {
  const attemptFilter = buildUserFilters({ branchId, positionId, managerBranchId });
  const dateFilter = buildDateFilters({ from, to }, "aa.completed_at");
  const conditions = ['aa.status = "completed"', ...dateFilter.clauses];
  const params = [...dateFilter.params];

  // Branch filtering behaves differently when a branch is provided: we still want individual rows per branch.
  if (positionId) {
    conditions.push("u.position_id = ?");
    params.push(positionId);
  }
  if (managerBranchId && !branchId) {
    conditions.push("u.branch_id = ?");
    params.push(managerBranchId);
  } else if (branchId) {
    conditions.push("u.branch_id = ?");
    params.push(branchId);
  }

  const [rows] = await pool.execute(
    `SELECT
       b.id AS branchId,
       b.name AS branchName,
       COUNT(*) AS attempts,
       COUNT(DISTINCT aa.assessment_id) AS assessments,
       COUNT(DISTINCT aa.user_id) AS participants,
       AVG(aa.score_percent) AS averageScore,
       AVG(NULLIF(aa.time_spent_seconds, 0)) AS averageTime,
       SUM(CASE WHEN aa.score_percent IS NOT NULL AND aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) AS passed
     FROM assessment_attempts aa
     JOIN assessments a ON a.id = aa.assessment_id
     JOIN users u ON u.id = aa.user_id
     LEFT JOIN branches b ON b.id = u.branch_id
     WHERE ${conditions.join(" AND ")}
     GROUP BY b.id, b.name
     ORDER BY attempts DESC`,
    params
  );

  return rows.map((row) => ({
    branchId: row.branchId != null ? Number(row.branchId) : null,
    branchName: row.branchName || "Не указан",
    attempts: Number(row.attempts || 0),
    assessments: Number(row.assessments || 0),
    participants: Number(row.participants || 0),
    averageScore: row.averageScore != null ? Number(row.averageScore) : null,
    averageTimeSeconds: row.averageTime != null ? Number(row.averageTime) : null,
    passRate: row.attempts ? Math.round((Number(row.passed || 0) / Number(row.attempts)) * 100) : 0,
  }));
}

async function getEmployeePerformance({
  from = null,
  to = null,
  branchId = null,
  positionId = null,
  managerBranchId = null,
  sortBy = "score",
  limit = 20,
}) {
  const dateFilter = buildDateFilters({ from, to }, "aa.completed_at");
  const conditions = ['aa.status = "completed"', ...dateFilter.clauses];
  const params = [...dateFilter.params];

  if (branchId) {
    conditions.push("u.branch_id = ?");
    params.push(branchId);
  } else if (managerBranchId) {
    conditions.push("u.branch_id = ?");
    params.push(managerBranchId);
  }
  if (positionId) {
    conditions.push("u.position_id = ?");
    params.push(positionId);
  }

  const allowedSort = {
    score: "avg_score DESC",
    time: "avg_time ASC",
    attempts: "attempts DESC",
    passrate: "pass_rate DESC",
  };
  const order = allowedSort[sortBy] || allowedSort.score;

  const sanitizedLimit = Math.max(1, Math.min(Number(limit) || 20, 50));

  const [rows] = await pool.execute(
    `SELECT
       u.id AS userId,
       u.first_name,
       u.last_name,
       b.name AS branchName,
       p.name AS positionName,
       COUNT(*) AS attempts,
       AVG(aa.score_percent) AS avg_score,
       AVG(NULLIF(aa.time_spent_seconds, 0)) AS avg_time,
       SUM(CASE WHEN aa.score_percent IS NOT NULL AND aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) AS passed
     FROM assessment_attempts aa
     JOIN assessments a ON a.id = aa.assessment_id
     JOIN users u ON u.id = aa.user_id
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN positions p ON p.id = u.position_id
     WHERE ${conditions.join(" AND ")}
     GROUP BY u.id, u.first_name, u.last_name, b.name, p.name
     ORDER BY ${order}, attempts DESC
     LIMIT ${sanitizedLimit}`,
    params
  );

  return rows.map((row) => {
    const attempts = Number(row.attempts || 0);
    const passed = Number(row.passed || 0);
    return {
      userId: Number(row.userId),
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      branchName: row.branchName || "—",
      positionName: row.positionName || "—",
      attempts,
      averageScore: row.avg_score != null ? Number(row.avg_score) : null,
      averageTimeSeconds: row.avg_time != null ? Number(row.avg_time) : null,
      passRate: attempts ? Math.round((passed / attempts) * 100) : 0,
    };
  });
}

module.exports = {
  getSummary,
  getBranchBreakdown,
  getEmployeePerformance,
};
