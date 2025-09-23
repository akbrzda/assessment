const { pool } = require('../config/database');

function buildFilterClauses({ branchId = null, positionId = null } = {}) {
  const clauses = ["r.name = 'employee'"];
  const params = [];

  if (branchId) {
    clauses.push('u.branch_id = ?');
    params.push(Number(branchId));
  }

  if (positionId) {
    clauses.push('u.position_id = ?');
    params.push(Number(positionId));
  }

  return { clauses, params };
}

function buildWhere(clauses) {
  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
}

function mapLeaderRow(row) {
  if (!row) {
    return null;
  }

  const avgScorePercent = row.avg_score_percent != null ? Number(row.avg_score_percent) : null;
  const avgTimeSeconds = row.avg_time_seconds != null ? Number(row.avg_time_seconds) : null;

  return {
    userId: Number(row.user_id || row.id),
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    avatarUrl: row.avatar_url || null,
    branchId: row.branch_id != null ? Number(row.branch_id) : null,
    branchName: row.branch_name || null,
    positionId: row.position_id != null ? Number(row.position_id) : null,
    positionName: row.position_name || null,
    roleName: row.role_name || null,
    level: row.level != null ? Number(row.level) : 1,
    points: row.points != null ? Number(row.points) : 0,
    avgScorePercent,
    avgTimeSeconds,
    completedAttempts: row.completed_attempts != null ? Number(row.completed_attempts) : 0
  };
}

async function getUserLeaders({ branchId = null, positionId = null, limit = 30 } = {}) {
  const sanitizedLimit = Math.max(1, Math.min(Number(limit) || 30, 100));
  const { clauses, params } = buildFilterClauses({ branchId, positionId });
  const where = buildWhere(clauses);

  const limitClause = `LIMIT ${sanitizedLimit}`;

  const [rows] = await pool.execute(
    `SELECT
       u.id AS user_id,
       u.first_name,
       u.last_name,
       u.avatar_url,
       u.points,
       u.level,
       u.branch_id,
       u.position_id,
       r.name AS role_name,
       b.name AS branch_name,
       p.name AS position_name,
       stats.avg_score_percent,
       stats.avg_time_seconds,
       stats.completed_attempts
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN positions p ON p.id = u.position_id
     LEFT JOIN (
       SELECT
         aa.user_id,
         AVG(aa.score_percent) AS avg_score_percent,
         AVG(NULLIF(aa.time_spent_seconds, 0)) AS avg_time_seconds,
         COUNT(*) AS completed_attempts
       FROM assessment_attempts aa
       WHERE aa.status = 'completed'
       GROUP BY aa.user_id
     ) stats ON stats.user_id = u.id
     ${where}
     ORDER BY
       u.points DESC,
       COALESCE(stats.avg_score_percent, 0) DESC,
       COALESCE(stats.avg_time_seconds, 999999) ASC,
       u.id ASC
     ${limitClause}`
    , params
  );

  return rows.map(mapLeaderRow);
}

async function getUserRankAndStats({ userId, branchId = null, positionId = null } = {}) {
  if (!userId) {
    return null;
  }

  const { clauses, params } = buildFilterClauses({ branchId, positionId });

  const userClauses = [...clauses, 'u.id = ?'];
  const userParams = [...params, userId];
  const userWhere = buildWhere(userClauses);

  const [userRows] = await pool.execute(
    `SELECT
       u.id AS user_id,
       u.first_name,
       u.last_name,
       u.avatar_url,
       u.points,
       u.level,
       u.branch_id,
       u.position_id,
       r.name AS role_name,
       b.name AS branch_name,
       p.name AS position_name,
       stats.avg_score_percent,
       stats.avg_time_seconds,
       stats.completed_attempts
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN positions p ON p.id = u.position_id
     LEFT JOIN (
       SELECT
         aa.user_id,
         AVG(aa.score_percent) AS avg_score_percent,
         AVG(NULLIF(aa.time_spent_seconds, 0)) AS avg_time_seconds,
         COUNT(*) AS completed_attempts
       FROM assessment_attempts aa
       WHERE aa.status = 'completed'
       GROUP BY aa.user_id
     ) stats ON stats.user_id = u.id
     ${userWhere}
     LIMIT 1`
    , userParams
  );

  if (!userRows.length) {
    return null;
  }

  const user = mapLeaderRow(userRows[0]);
  const points = user.points;

  const rankClauses = [...clauses, '(u.points > ? OR (u.points = ? AND u.id < ?))'];
  const rankParams = [...params, points, points, userId];
  const rankWhere = buildWhere(rankClauses);

  const [[rankRow]] = await pool.execute(
    `SELECT COUNT(*) AS ahead
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ${rankWhere}`,
    rankParams
  );

  const totalWhere = buildWhere(clauses);
  const [[totalRow]] = await pool.execute(
    `SELECT COUNT(*) AS total
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ${totalWhere}`,
    params
  );

  return {
    ...user,
    rank: Number(rankRow?.ahead || 0) + 1,
    totalParticipants: Number(totalRow?.total || 0)
  };
}

module.exports = {
  getUserLeaders,
  getUserRankAndStats
};
