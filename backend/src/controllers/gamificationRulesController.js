const rulesEngine = require("../services/gamificationRulesEngine");
const { pool } = require("../config/database");

// Симуляция начисления очков/бейджей по входным данным (без записи в БД)
exports.dryRun = async (req, res, next) => {
  try {
    const {
      event,
      userId,
      assessmentId,
      branchId,
      positionId,
      scorePercent,
      passed,
      perfect,
      timeSpentSeconds,
      timeLimitMinutes,
      currentStreak,
      answerCorrect,
    } = req.body || {};

    const hasTimeLimit = timeLimitMinutes != null && Number(timeLimitMinutes) > 0;
    const totalSeconds = hasTimeLimit ? Number(timeLimitMinutes) * 60 : 0;
    const timeRatio = hasTimeLimit && totalSeconds > 0 && timeSpentSeconds > 0 ? Number(timeSpentSeconds) / totalSeconds : null;

    const connection = await pool.getConnection();
    try {
      const result = await rulesEngine.evaluate({
        connection,
        context: {
          event: event || "attempt",
          userId: Number(userId) || null,
          assessmentId: Number(assessmentId) || null,
          branchId: Number(branchId) || null,
          positionId: Number(positionId) || null,
          scorePercent: Number(scorePercent) || 0,
          passed: !!passed,
          perfect: !!perfect,
          timeRatio,
          currentStreak: Number(currentStreak) || 0,
          answerCorrect: !!answerCorrect,
        },
      });

      const total = (result.events || []).reduce((s, e) => s + (e.points || 0), 0);
      res.json({
        usedRules: result.usedRules,
        totalPoints: total,
        events: result.events,
        badges: result.badges,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};
