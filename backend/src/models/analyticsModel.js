const { pool } = require('../config/database');

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
    clauses.push('u.branch_id = ?');
    params.push(branchId);
  } else if (managerBranchId) {
    clauses.push('u.branch_id = ?');
    params.push(managerBranchId);
  }
  if (positionId) {
    clauses.push('u.position_id = ?');
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
  const attemptFilter = buildUserFilters({ branchId, positionId, managerBranchId });
  const dateFilter = buildDateFilters({ from, to }, 'aa.completed_at');

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
     WHERE ${attemptConditions.join(' AND ') || '1=1'}`,
    attemptParams
  );

  const assignmentFilter = buildUserFilters({ branchId, positionId, managerBranchId });
  const assignmentDateFilter = buildDateFilters({ from, to }, 'a.open_at');
  const assignmentConditions = [...assignmentFilter.clauses, ...assignmentDateFilter.clauses];
  const assignmentParams = [...assignmentFilter.params, ...assignmentDateFilter.params];

  const [assignmentRows] = await pool.execute(
    `SELECT
       COUNT(DISTINCT assigned.assessment_id) AS total_assessments,
       COUNT(DISTINCT assigned.user_id) AS total_users,
       COUNT(*) AS total_assignments
     FROM (
       SELECT aua.assessment_id, aua.user_id
       FROM assessment_user_assignments aua
       UNION
       SELECT apa.assessment_id, u.id AS user_id
         FROM assessment_position_assignments apa
         JOIN users u ON u.position_id = apa.position_id
       UNION
       SELECT aba.assessment_id, u.id AS user_id
         FROM assessment_branch_assignments aba
         JOIN users u ON u.branch_id = aba.branch_id
     ) AS assigned
     JOIN users u ON u.id = assigned.user_id
     JOIN assessments a ON a.id = assigned.assessment_id
     ${assignmentConditions.length ? `WHERE ${assignmentConditions.join(' AND ')}` : ''}`,
    assignmentParams
  );

  const now = new Date();
  const nowIso = now.toISOString().slice(0, 19).replace('T', ' ');

  const activeFilter = buildUserFilters({ branchId, positionId, managerBranchId });
  const activeConditions = [...activeFilter.clauses, 'a.open_at <= ?', 'a.close_at >= ?'];
  const activeParams = [...activeFilter.params, nowIso, nowIso];

  const [activeRows] = await pool.execute(
    `SELECT COUNT(DISTINCT assigned.assessment_id) AS active_assessments
     FROM (
       SELECT aua.assessment_id, aua.user_id
       FROM assessment_user_assignments aua
       UNION
       SELECT apa.assessment_id, u.id AS user_id
         FROM assessment_position_assignments apa
         JOIN users u ON u.position_id = apa.position_id
       UNION
       SELECT aba.assessment_id, u.id AS user_id
         FROM assessment_branch_assignments aba
         JOIN users u ON u.branch_id = aba.branch_id
     ) assigned
     JOIN users u ON u.id = assigned.user_id
     JOIN assessments a ON a.id = assigned.assessment_id
     WHERE ${activeConditions.join(' AND ')}`,
    activeParams
  );

  const attempts = attemptRows[0] || {};
  const assignments = assignmentRows[0] || {};
  const active = activeRows[0] || {};

  const completedAttempts = Number(attempts.completedAttempts || 0);
  const passedAttempts = Number(attempts.passedAttempts || 0);
  const passRate = completedAttempts ? Math.round((passedAttempts / completedAttempts) * 100) : 0;

  return {
    totalAssessments: Number(assignments.total_assessments || 0),
    distinctAssessments: Number(attempts.distinctAssessments || 0),
    activeAssessments: Number(active.active_assessments || 0),
    completedAttempts,
    passRate,
    averageScore: attempts.averageScore != null ? Number(attempts.averageScore) : null,
    averageTimeSeconds: attempts.averageTime != null ? Number(attempts.averageTime) : null,
    assignedUsers: Number(assignments.total_users || 0),
    totalAssignments: Number(assignments.total_assignments || 0)
  };
}

async function getBranchBreakdown({ from = null, to = null, branchId = null, positionId = null, managerBranchId = null }) {
  const attemptFilter = buildUserFilters({ branchId, positionId, managerBranchId });
  const dateFilter = buildDateFilters({ from, to }, 'aa.completed_at');
  const conditions = ['aa.status = "completed"', ...dateFilter.clauses];
  const params = [...dateFilter.params];

  // Branch filtering behaves differently when a branch is provided: we still want individual rows per branch.
  if (positionId) {
    conditions.push('u.position_id = ?');
    params.push(positionId);
  }
  if (managerBranchId && !branchId) {
    conditions.push('u.branch_id = ?');
    params.push(managerBranchId);
  } else if (branchId) {
    conditions.push('u.branch_id = ?');
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
     WHERE ${conditions.join(' AND ')}
     GROUP BY b.id, b.name
     ORDER BY attempts DESC`,
    params
  );

  return rows.map((row) => ({
    branchId: row.branchId != null ? Number(row.branchId) : null,
    branchName: row.branchName || 'Не указан',
    attempts: Number(row.attempts || 0),
    assessments: Number(row.assessments || 0),
    participants: Number(row.participants || 0),
    averageScore: row.averageScore != null ? Number(row.averageScore) : null,
    averageTimeSeconds: row.averageTime != null ? Number(row.averageTime) : null,
    passRate: row.attempts ? Math.round((Number(row.passed || 0) / Number(row.attempts)) * 100) : 0
  }));
}

async function getEmployeePerformance({
  from = null,
  to = null,
  branchId = null,
  positionId = null,
  managerBranchId = null,
  sortBy = 'score',
  limit = 20
}) {
  const dateFilter = buildDateFilters({ from, to }, 'aa.completed_at');
  const conditions = ['aa.status = "completed"', ...dateFilter.clauses];
  const params = [...dateFilter.params];

  if (branchId) {
    conditions.push('u.branch_id = ?');
    params.push(branchId);
  } else if (managerBranchId) {
    conditions.push('u.branch_id = ?');
    params.push(managerBranchId);
  }
  if (positionId) {
    conditions.push('u.position_id = ?');
    params.push(positionId);
  }

  const allowedSort = {
    score: 'avg_score DESC',
    time: 'avg_time ASC',
    attempts: 'attempts DESC',
    passrate: 'pass_rate DESC'
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
     WHERE ${conditions.join(' AND ')}
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
      branchName: row.branchName || '—',
      positionName: row.positionName || '—',
      attempts,
      averageScore: row.avg_score != null ? Number(row.avg_score) : null,
      averageTimeSeconds: row.avg_time != null ? Number(row.avg_time) : null,
      passRate: attempts ? Math.round((passed / attempts) * 100) : 0
    };
  });
}

module.exports = {
  getSummary,
  getBranchBreakdown,
  getEmployeePerformance
};
