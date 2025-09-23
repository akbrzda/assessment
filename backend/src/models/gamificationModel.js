const { pool } = require('../config/database');

function getExecutor(connection) {
  return connection || pool;
}

async function getLevels(connection) {
  const executor = getExecutor(connection);
  const [rows] = await executor.execute(
    `SELECT level_number AS levelNumber, code, name, min_points AS minPoints
       FROM gamification_levels
      ORDER BY min_points ASC`
  );
  return rows.map((row) => ({
    levelNumber: Number(row.levelNumber),
    code: row.code,
    name: row.name,
    minPoints: Number(row.minPoints)
  }));
}

async function findLevelForPoints(points, connection) {
  const executor = getExecutor(connection);
  const [rows] = await executor.execute(
    `SELECT level_number AS levelNumber, code, name, min_points AS minPoints
       FROM gamification_levels
      WHERE min_points <= ?
      ORDER BY min_points DESC
      LIMIT 1`
    , [Math.max(0, Number(points) || 0)]
  );
  return rows.length
    ? {
        levelNumber: Number(rows[0].levelNumber),
        code: rows[0].code,
        name: rows[0].name,
        minPoints: Number(rows[0].minPoints)
      }
    : null;
}

async function findNextLevel(points, connection) {
  const executor = getExecutor(connection);
  const [rows] = await executor.execute(
    `SELECT level_number AS levelNumber, code, name, min_points AS minPoints
       FROM gamification_levels
      WHERE min_points > ?
      ORDER BY min_points ASC
      LIMIT 1`
    , [Math.max(0, Number(points) || 0)]
  );
  return rows.length
    ? {
        levelNumber: Number(rows[0].levelNumber),
        code: rows[0].code,
        name: rows[0].name,
        minPoints: Number(rows[0].minPoints)
      }
    : null;
}

async function ensureUserStats(userId, connection) {
  const executor = getExecutor(connection);
  await executor.execute(
    `INSERT IGNORE INTO user_gamification_stats (user_id)
     VALUES (?)`
    , [userId]
  );
}

async function getUserStats(userId, connection, { forUpdate = false } = {}) {
  const executor = getExecutor(connection);
  const lock = forUpdate ? 'FOR UPDATE' : '';
  const [rows] = await executor.execute(
    `SELECT user_id AS userId,
            current_streak AS currentStreak,
            longest_streak AS longestStreak,
            last_success_at AS lastSuccessAt,
            last_attempt_at AS lastAttemptAt,
            last_streak_award AS lastStreakAward
       FROM user_gamification_stats
      WHERE user_id = ?
      ${lock}`,
    [userId]
  );
  if (!rows.length) {
    return null;
  }
  const row = rows[0];
  return {
    userId: Number(row.userId),
    currentStreak: Number(row.currentStreak || 0),
    longestStreak: Number(row.longestStreak || 0),
    lastSuccessAt: row.lastSuccessAt,
    lastAttemptAt: row.lastAttemptAt,
    lastStreakAward: Number(row.lastStreakAward || 0)
  };
}

async function updateUserStats(userId, payload, connection) {
  const executor = getExecutor(connection);
  const fields = [];
  const values = [];

  if (payload.currentStreak != null) {
    fields.push('current_streak = ?');
    values.push(Number(payload.currentStreak));
  }
  if (payload.longestStreak != null) {
    fields.push('longest_streak = ?');
    values.push(Number(payload.longestStreak));
  }
  if (payload.lastSuccessAt !== undefined) {
    fields.push('last_success_at = ?');
    values.push(payload.lastSuccessAt);
  }
  if (payload.lastAttemptAt !== undefined) {
    fields.push('last_attempt_at = ?');
    values.push(payload.lastAttemptAt);
  }
  if (payload.lastStreakAward != null) {
    fields.push('last_streak_award = ?');
    values.push(Number(payload.lastStreakAward));
  }

  if (!fields.length) {
    return;
  }

  await executor.execute(
    `UPDATE user_gamification_stats
        SET ${fields.join(', ')},
            updated_at = NOW()
      WHERE user_id = ?`
    , [...values, userId]
  );
}

async function getUserContext(userId, connection, { forUpdate = false } = {}) {
  const executor = getExecutor(connection);
  const lock = forUpdate ? 'FOR UPDATE' : '';
  const [rows] = await executor.execute(
    `SELECT u.id,
            u.points,
            u.level,
            u.first_name AS firstName,
            u.last_name AS lastName,
            u.branch_id AS branchId,
            u.position_id AS positionId,
            r.name AS roleName,
            b.name AS branchName,
            p.name AS positionName
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN branches b ON b.id = u.branch_id
       LEFT JOIN positions p ON p.id = u.position_id
      WHERE u.id = ?
      ${lock}`,
    [userId]
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    id: Number(row.id),
    points: Number(row.points || 0),
    level: Number(row.level || 1),
    firstName: row.firstName,
    lastName: row.lastName,
    branchId: row.branchId != null ? Number(row.branchId) : null,
    positionId: row.positionId != null ? Number(row.positionId) : null,
    roleName: row.roleName,
    branchName: row.branchName,
    positionName: row.positionName
  };
}

async function updateUserProgress(userId, { points, level }, connection) {
  const executor = getExecutor(connection);
  await executor.execute(
    `UPDATE users
        SET points = ?,
            level = ?,
            updated_at = NOW()
      WHERE id = ?`
    , [Number(points), Number(level), userId]
  );
}

async function listBadgeCatalog(connection) {
  const executor = getExecutor(connection);
  const [rows] = await executor.execute(
    `SELECT id, code, name, description, icon
       FROM badges
      ORDER BY id ASC`
  );
  return rows.map((row) => ({
    id: Number(row.id),
    code: row.code,
    name: row.name,
    description: row.description,
    icon: row.icon
  }));
}

async function getBadgeByCode(code, connection) {
  const executor = getExecutor(connection);
  const [rows] = await executor.execute(
    `SELECT id, code, name, description, icon
       FROM badges
      WHERE code = ?
      LIMIT 1`,
    [code]
  );
  return rows.length
    ? {
        id: Number(rows[0].id),
        code: rows[0].code,
        name: rows[0].name,
        description: rows[0].description,
        icon: rows[0].icon
      }
    : null;
}

async function listUserBadges(userId, connection) {
  const executor = getExecutor(connection);
  const [rows] = await executor.execute(
    `SELECT b.id,
            b.code,
            b.name,
            b.description,
            b.icon,
            ub.awarded_at AS awardedAt,
            ub.description AS awardDescription
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = ?
      ORDER BY ub.awarded_at DESC`
    , [userId]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    code: row.code,
    name: row.name,
    description: row.description,
    icon: row.icon,
    awardedAt: row.awardedAt,
    awardDescription: row.awardDescription
  }));
}

async function awardBadge({ userId, badgeId, attemptId = null, description = null }, connection) {
  const executor = getExecutor(connection);
  const [result] = await executor.execute(
    `INSERT IGNORE INTO user_badges (user_id, badge_id, attempt_id, description)
     VALUES (?, ?, ?, ?)`
    , [userId, badgeId, attemptId, description]
  );
  return result.affectedRows > 0;
}

async function recordEvent({ userId, attemptId = null, eventType, pointsDelta, description = null, branchId = null, positionId = null }, connection) {
  const executor = getExecutor(connection);
  await executor.execute(
    `INSERT INTO gamification_events (user_id, attempt_id, event_type, points_delta, description, branch_id, position_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
    , [userId, attemptId, eventType, Number(pointsDelta), description, branchId, positionId]
  );
}

async function ensureMonthlyChallenge(connection) {
  const executor = getExecutor(connection);
  const [[currentMonth]] = await executor.execute(
    `SELECT DATE_FORMAT(CURDATE(), '%Y-%m-01') AS periodStart,
            LAST_DAY(CURDATE()) AS periodEnd`
  );

  const [existingRows] = await executor.execute(
    `SELECT id, title, description, period_start AS periodStart, period_end AS periodEnd, status
       FROM team_challenges
      WHERE period_start = ?
      LIMIT 1`
    , [currentMonth.periodStart]
  );

  if (existingRows.length) {
    const challenge = existingRows[0];
    if (challenge.status !== 'active') {
      await executor.execute(
        `UPDATE team_challenges
            SET status = 'active',
                period_end = ?,
                updated_at = NOW()
          WHERE id = ?`
        , [currentMonth.periodEnd, challenge.id]
      );
      challenge.status = 'active';
      challenge.periodEnd = currentMonth.periodEnd;
    }
    challenge.periodStart = currentMonth.periodStart;
    return {
      id: Number(challenge.id),
      title: challenge.title,
      description: challenge.description,
      periodStart: challenge.periodStart,
      periodEnd: challenge.periodEnd,
      status: challenge.status
    };
  }

  const [insertResult] = await executor.execute(
    `INSERT INTO team_challenges (title, description, period_start, period_end, status)
     VALUES (?, ?, ?, ?, 'active')`
    , [
      'Командный челлендж месяца',
      'Суммарные очки филиалов за текущий месяц',
      currentMonth.periodStart,
      currentMonth.periodEnd
    ]
  );

  return {
    id: Number(insertResult.insertId),
    title: 'Командный челлендж месяца',
    description: 'Суммарные очки филиалов за текущий месяц',
    periodStart: currentMonth.periodStart,
    periodEnd: currentMonth.periodEnd,
    status: 'active'
  };
}

async function incrementChallengeBranchScore({ challengeId, branchId, points }, connection) {
  if (!branchId || !points) {
    return;
  }
  const executor = getExecutor(connection);
  await executor.execute(
    `INSERT INTO team_challenge_branch_scores (challenge_id, branch_id, points)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       points = points + VALUES(points),
       updated_at = NOW()`
    , [challengeId, branchId, Number(points)]
  );
}

async function listChallengeBranchScores(challengeId, connection) {
  const executor = getExecutor(connection);
  const [rows] = await executor.execute(
    `SELECT tcbs.branch_id AS branchId,
            b.name AS branchName,
            tcbs.points,
            tcbs.updated_at AS updatedAt
       FROM team_challenge_branch_scores tcbs
       JOIN branches b ON b.id = tcbs.branch_id
      WHERE tcbs.challenge_id = ?
      ORDER BY tcbs.points DESC, b.name ASC`
    , [challengeId]
  );

  return rows.map((row) => ({
    branchId: Number(row.branchId),
    branchName: row.branchName,
    points: Number(row.points || 0),
    updatedAt: row.updatedAt
  }));
}

async function listUserMonthlyPoints(userId, connection) {
  const executor = getExecutor(connection);
  const [[row]] = await executor.execute(
    `SELECT COALESCE(SUM(points_delta), 0) AS total
       FROM gamification_events
      WHERE user_id = ?
        AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
    , [userId]
  );
  return Number(row?.total || 0);
}

module.exports = {
  getLevels,
  findLevelForPoints,
  findNextLevel,
  ensureUserStats,
  getUserStats,
  updateUserStats,
  getUserContext,
  updateUserProgress,
  listBadgeCatalog,
  getBadgeByCode,
  listUserBadges,
  awardBadge,
  recordEvent,
  ensureMonthlyChallenge,
  incrementChallengeBranchScore,
  listChallengeBranchScores,
  listUserMonthlyPoints
};
