const { pool } = require("../config/database");
const gamificationModel = require("../models/gamificationModel");
const logger = require("../utils/logger");
const { buildAuditEntry, logAuditEvent } = require("./auditService");
const rulesEngine = require("./gamificationRulesEngine");

const BADGES = {
  PERFECT: "perfect_run",
  SPEED: "speedster",
  COMPETENCE: "competence_90",
  STREAK: "streak_master",
  ALL_COMPLETED: "all_tests_completed",
};

const STREAK_MILESTONES = [
  { value: 3, bonus: 25 },
  { value: 5, bonus: 40 },
  { value: 10, bonus: 75 },
];

const COMPETENCE_THRESHOLD = 90;

function formatNumber(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

async function hasUnfinishedAssignments(connection, userId) {
  const placeholderSql = `
    SELECT DISTINCT assessment_id
      FROM assessment_user_assignments
     WHERE user_id = ?
    UNION
    SELECT apa.assessment_id
      FROM assessment_position_assignments apa
      JOIN users u ON u.position_id = apa.position_id
     WHERE u.id = ?
    UNION
    SELECT aba.assessment_id
      FROM assessment_branch_assignments aba
      JOIN users u ON u.branch_id = aba.branch_id
     WHERE u.id = ?
  `;

  const [[totalRow]] = await connection.execute(
    `SELECT COUNT(*) AS total
       FROM (${placeholderSql}) assigned`,
    [userId, userId, userId]
  );

  const totalAssigned = Number(totalRow?.total || 0);
  if (totalAssigned === 0) {
    return { totalAssigned, unfinished: totalAssigned };
  }

  const [[unfinishedRow]] = await connection.execute(
    `SELECT COUNT(*) AS total
       FROM (${placeholderSql}) assigned
       JOIN assessments a ON a.id = assigned.assessment_id
       LEFT JOIN (
         SELECT assessment_id,
                MAX(score_percent) AS best_score
           FROM assessment_attempts
          WHERE user_id = ?
            AND status = 'completed'
          GROUP BY assessment_id
       ) attempts ON attempts.assessment_id = assigned.assessment_id
      WHERE attempts.best_score IS NULL
         OR attempts.best_score < a.pass_score_percent`,
    [userId, userId, userId, userId]
  );

  return {
    totalAssigned,
    unfinished: Number(unfinishedRow?.total || 0),
  };
}

function buildEvent(type, points, description) {
  return {
    type,
    points: Math.round(points),
    description,
  };
}

async function processAnswerEvent({ userId, attemptId, assessmentId, questionId, answerCorrect }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await gamificationModel.ensureUserStats(userId, connection);
    const user = await gamificationModel.getUserContext(userId, connection, { forUpdate: true });
    if (!user) {
      throw new Error(`User ${userId} not found for gamification update`);
    }
    if (user.roleName !== "employee") {
      await connection.rollback();
      return { skipped: true, reason: "not_employee" };
    }

    const engineResult = await rulesEngine.evaluate({
      connection,
      context: {
        event: "answer",
        userId,
        assessmentId,
        attemptId,
        questionId,
        branchId: user.branchId,
        positionId: user.positionId,
        answerCorrect: !!answerCorrect,
      },
      combine: "additive",
    });

    if (!engineResult.usedRules || (!engineResult.events?.length && !engineResult.badges?.length)) {
      await connection.rollback();
      return { skipped: true, reason: "no_matching_rules" };
    }

    const totalEarned = (engineResult.events || []).reduce((s, e) => s + (e.points || 0), 0);

    if (totalEarned) {
      const newPoints = Math.max(0, (await gamificationModel.getUserContext(userId, connection)).points + totalEarned);
      // Без изменения уровня на ответах (уровень пересчитается при завершении попытки или суммарно)
      await gamificationModel.updateUserProgress(userId, { points: newPoints }, connection);
    }

    for (const e of engineResult.events || []) {
      if (!e.points) continue;
      await gamificationModel.recordEvent(
        {
          userId,
          attemptId,
          eventType: e.type,
          pointsDelta: Math.round(e.points),
          description: e.description || (answerCorrect ? "Верный ответ" : "Неверный ответ"),
          branchId: user.branchId,
          positionId: user.positionId,
        },
        connection
      );
    }

    const awardedBadges = [];
    for (const code of engineResult.badges || []) {
      const badge = await gamificationModel.getBadgeByCode(code, connection);
      if (!badge) continue;
      const inserted = await gamificationModel.awardBadge(
        {
          userId,
          badgeId: badge.id,
          attemptId,
          description: badge.description,
        },
        connection
      );
      if (inserted) {
        awardedBadges.push({ code: badge.code, name: badge.name });
      }
    }

    await connection.commit();

    // Аудит (асинхронно)
    const entry = buildAuditEntry({
      scope: "system",
      action: "gamification.answer.reward",
      entity: "assessment_answer",
      entityId: attemptId,
      actor: { id: null, role: "system", name: "GamificationService" },
      metadata: {
        userId,
        attemptId,
        assessmentId,
        questionId,
        answerCorrect: !!answerCorrect,
        totalEarned,
        badges: awardedBadges,
      },
    });
    logAuditEvent(entry).catch(() => {});

    return { awardedPoints: totalEarned, badges: awardedBadges };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function processAttemptCompletion({ userId, attemptId, assessment, attempt }) {
  const connection = await pool.getConnection();
  const logContext = {
    lines: [],
    badges: [],
  };

  try {
    await connection.beginTransaction();

    await gamificationModel.ensureUserStats(userId, connection);

    const user = await gamificationModel.getUserContext(userId, connection, { forUpdate: true });
    if (!user) {
      throw new Error(`User ${userId} not found for gamification update`);
    }

    if (user.roleName !== "employee") {
      await connection.rollback();
      return {
        skipped: true,
        reason: "not_employee",
      };
    }

    let stats = await gamificationModel.getUserStats(userId, connection, { forUpdate: true });
    if (!stats) {
      stats = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastSuccessAt: null,
        lastAttemptAt: null,
        lastStreakAward: 0,
      };
    }

    const passed =
      attempt.scorePercent != null && assessment.passScorePercent != null
        ? Number(attempt.scorePercent) >= Number(assessment.passScorePercent)
        : false;

    let events = [];
    const badgesToAward = new Set();
    const now = new Date();

    // Рассчёт через движок правил (если включён), иначе старая логика
    const hasTimeLimit = assessment.timeLimitMinutes != null && Number(assessment.timeLimitMinutes) > 0;
    const timeSpentSeconds = formatNumber(attempt.timeSpentSeconds);
    const totalSeconds = hasTimeLimit ? Number(assessment.timeLimitMinutes) * 60 : 0;
    const timeRatio = hasTimeLimit && totalSeconds > 0 && timeSpentSeconds > 0 ? timeSpentSeconds / totalSeconds : null;

    const engineResult = await rulesEngine.evaluate({
      connection,
      context: {
        userId,
        assessmentId: assessment.id,
        branchId: user.branchId,
        positionId: user.positionId,
        scorePercent: formatNumber(attempt.scorePercent),
        passed,
        perfect: attempt.totalQuestions && attempt.totalQuestions > 0 && attempt.correctAnswers === attempt.totalQuestions,
        timeRatio,
        currentStreak: (stats.currentStreak || 0) + (passed ? 1 : 0),
      },
      combine: "additive",
    });

    let totalEarned = 0;
    if (engineResult.usedRules) {
      events = engineResult.events.map((e) => buildEvent(e.type, e.points, e.description));
      totalEarned = events.reduce((sum, e) => sum + (e.points || 0), 0);
      for (const code of engineResult.badges) {
        badgesToAward.add(code);
      }
    } else {
      // Fallback к текущей логике
      totalEarned = Math.max(0, Math.round(formatNumber(attempt.scorePercent)));
      if (totalEarned > 0) {
        events.push(buildEvent("base", totalEarned, `Результат ${formatNumber(attempt.scorePercent)}%`));
      }

      if (attempt.totalQuestions && attempt.totalQuestions > 0 && attempt.correctAnswers === attempt.totalQuestions) {
        const perfectBonus = 40;
        totalEarned += perfectBonus;
        events.push(buildEvent("perfect_bonus", perfectBonus, "Прохождение без ошибок"));
        badgesToAward.add(BADGES.PERFECT);
      }

      if (formatNumber(attempt.scorePercent) >= COMPETENCE_THRESHOLD) {
        const competenceBonus = 20;
        totalEarned += competenceBonus;
        events.push(buildEvent("competence_bonus", competenceBonus, "Высокий результат (90%+)"));
        badgesToAward.add(BADGES.COMPETENCE);
      }

      if (passed && hasTimeLimit && timeSpentSeconds > 0 && totalSeconds > 0) {
        const ratio = timeSpentSeconds / totalSeconds;
        let speedBonus = 0;
        if (ratio <= 0.5) {
          speedBonus = 25;
          badgesToAward.add(BADGES.SPEED);
        } else if (ratio <= 0.7) {
          speedBonus = 15;
        } else if (ratio <= 0.85) {
          speedBonus = 10;
        }
        if (speedBonus > 0) {
          totalEarned += speedBonus;
          events.push(buildEvent("speed_bonus", speedBonus, "Быстрое прохождение теста"));
        }
      }
    }

    let currentStreak = passed ? (stats.currentStreak || 0) + 1 : 0;
    let longestStreak = stats.longestStreak || 0;
    let lastStreakAward = passed ? stats.lastStreakAward || 0 : 0;

    if (passed) {
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
      if (!engineResult.usedRules) {
        for (const milestone of STREAK_MILESTONES) {
          if (currentStreak >= milestone.value && milestone.value > lastStreakAward) {
            totalEarned += milestone.bonus;
            events.push(buildEvent("streak_bonus", milestone.bonus, `Серия ${currentStreak} успешных тестов`));
            lastStreakAward = milestone.value;
            if (milestone.value >= 5) {
              badgesToAward.add(BADGES.STREAK);
            }
          }
        }
      }
    }

    const statsUpdate = {
      currentStreak,
      longestStreak,
      lastStreakAward,
      lastAttemptAt: now,
      lastSuccessAt: passed ? now : stats.lastSuccessAt,
    };

    await gamificationModel.updateUserStats(userId, statsUpdate, connection);

    const previousPoints = user.points;
    const previousLevel = user.level;

    const newPoints = Math.max(0, previousPoints + totalEarned);
    const levelInfo = await gamificationModel.findLevelForPoints(newPoints, connection);
    const nextLevelInfo = await gamificationModel.findNextLevel(newPoints, connection);
    const newLevel = levelInfo ? levelInfo.levelNumber : previousLevel;

    await gamificationModel.updateUserProgress(userId, { points: newPoints, level: newLevel }, connection);

    for (const event of events) {
      if (!event.points) {
        continue;
      }
      await gamificationModel.recordEvent(
        {
          userId,
          attemptId,
          eventType: event.type,
          pointsDelta: event.points,
          description: event.description,
          branchId: user.branchId,
          positionId: user.positionId,
        },
        connection
      );
    }

    if (passed) {
      const assignmentState = await hasUnfinishedAssignments(connection, userId);
      if (assignmentState.totalAssigned > 0 && assignmentState.unfinished === 0) {
        if (engineResult.usedRules) {
          badgesToAward.add("all_tests_completed");
        } else {
          badgesToAward.add(BADGES.ALL_COMPLETED);
        }
      }
    }

    const awardedBadges = [];
    for (const code of badgesToAward) {
      const badge = await gamificationModel.getBadgeByCode(code, connection);
      if (!badge) {
        continue;
      }
      const inserted = await gamificationModel.awardBadge(
        {
          userId,
          badgeId: badge.id,
          attemptId,
          description: badge.description,
        },
        connection
      );
      if (inserted) {
        awardedBadges.push({
          code: badge.code,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
        });
      }
    }

    const monthlyPoints = await gamificationModel.listUserMonthlyPoints(userId, connection);

    await connection.commit();

    const response = {
      awardedPoints: totalEarned,
      breakdown: events,
      totals: {
        previousPoints,
        currentPoints: newPoints,
        previousLevel,
        currentLevel: newLevel,
        levelName: levelInfo?.name || null,
        nextLevel: nextLevelInfo
          ? {
              levelNumber: nextLevelInfo.levelNumber,
              name: nextLevelInfo.name,
              minPoints: nextLevelInfo.minPoints,
              pointsToReach: Math.max(nextLevelInfo.minPoints - newPoints, 0),
            }
          : null,
      },
      streak: {
        current: currentStreak,
        longest: longestStreak,
      },
      badges: awardedBadges,
      monthlyPoints,
    };

    logContext.lines.push(
      `🎮 <b>Геймификация</b>`,
      `Пользователь: ${user.firstName} ${user.lastName} (ID: ${userId})`,
      `Очки: +${totalEarned} → ${newPoints}`,
      `Результат: ${formatNumber(attempt.scorePercent)}% (${passed ? "успешно" : "неуспешно"})`
    );
    if (previousLevel !== newLevel) {
      logContext.lines.push(`Уровень: ${previousLevel} → ${newLevel}`);
    }
    if (awardedBadges.length) {
      logContext.lines.push(`Бейджи: ${awardedBadges.map((badge) => `${badge.icon || "🎖"} ${badge.name}`).join(", ")}`);
    }
    if (logContext.lines.length) {
      logContext.message = logContext.lines.join("\n");
    }

    return response;
  } catch (error) {
    await connection.rollback();
    logger.error("Gamification processing failed for attempt %s: %s", attemptId, error.message);
    throw error;
  } finally {
    connection.release();
    if (logContext.message) {
      const entry = buildAuditEntry({
        scope: "system",
        action: "gamification.reward.applied",
        entity: "assessment_attempt",
        entityId: attemptId,
        actor: { id: null, role: "system", name: "GamificationService" },
        metadata: {
          userId,
          totalEarned,
          newPoints,
          previousLevel,
          newLevel,
          badges: awardedBadges,
          streak: {
            current: currentStreak,
            longest: longestStreak,
          },
          rawMessage: logContext.message,
        },
      });
      logAuditEvent(entry).catch((logError) => {
        logger.error("Failed to record gamification audit log: %s", logError.message);
      });
    }
  }
}

async function getUserOverview(userId) {
  const connection = await pool.getConnection();
  try {
    await gamificationModel.ensureUserStats(userId, connection);
    const user = await gamificationModel.getUserContext(userId, connection, { forUpdate: false });
    if (!user) {
      return null;
    }

    const participationAllowed = user.roleName === "employee";
    const levels = await gamificationModel.getLevels(connection);
    const catalog = await gamificationModel.listBadgeCatalog(connection);

    let levelInfo = null;
    let nextLevel = null;
    let stats = {
      currentStreak: 0,
      longestStreak: 0,
      lastSuccessAt: null,
      lastAttemptAt: null,
    };
    let badges = catalog.map((badge) => ({
      code: badge.code,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earned: false,
      awardedAt: null,
    }));
    let monthlyPoints = 0;

    if (participationAllowed) {
      const statsData = await gamificationModel.getUserStats(userId, connection, { forUpdate: false });
      stats = {
        currentStreak: statsData?.currentStreak || 0,
        longestStreak: statsData?.longestStreak || 0,
        lastSuccessAt: statsData?.lastSuccessAt || null,
        lastAttemptAt: statsData?.lastAttemptAt || null,
      };

      levelInfo = await gamificationModel.findLevelForPoints(user.points, connection);
      const nextLevelInfo = await gamificationModel.findNextLevel(user.points, connection);
      nextLevel = nextLevelInfo
        ? {
            levelNumber: nextLevelInfo.levelNumber,
            name: nextLevelInfo.name,
            minPoints: nextLevelInfo.minPoints,
            pointsToReach: Math.max(nextLevelInfo.minPoints - user.points, 0),
          }
        : null;

      const earnedBadges = await gamificationModel.listUserBadges(userId, connection);
      const badgeMap = new Map(earnedBadges.map((item) => [item.code, item]));
      badges = catalog.map((badge) => ({
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earned: badgeMap.has(badge.code),
        awardedAt: badgeMap.get(badge.code)?.awardedAt || null,
      }));

      monthlyPoints = await gamificationModel.listUserMonthlyPoints(userId, connection);
    }

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        points: participationAllowed ? user.points : 0,
        level: participationAllowed ? user.level : 1,
        branchName: user.branchName,
        positionName: user.positionName,
      },
      levels,
      levelInfo,
      nextLevel,
      stats,
      badges,
      monthlyPoints,
      participationAllowed,
    };
  } finally {
    connection.release();
  }
}

module.exports = {
  processAttemptCompletion,
  getUserOverview,
  processAnswerEvent,
};
