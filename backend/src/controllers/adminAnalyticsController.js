const { pool } = require("../config/database");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

/**
 * Получить общую статистику
 */
exports.getOverallStats = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, branchId, positionId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereConditions = ['aa.status = "completed"'];
    const params = [];

    // Фильтр для управляющего - только его филиал
    if (userRole === "manager") {
      whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
      params.push(userId);
    }

    if (dateFrom) {
      whereConditions.push("aa.completed_at >= ?");
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push("aa.completed_at <= ?");
      params.push(dateTo);
    }

    if (branchId) {
      whereConditions.push("u.branch_id = ?");
      params.push(branchId);
    }

    if (positionId) {
      whereConditions.push("u.position_id = ?");
      params.push(positionId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // Общая статистика
    const [stats] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT aa.id) as total_attempts,
        COUNT(DISTINCT aa.user_id) as unique_users,
        COUNT(DISTINCT aa.assessment_id) as unique_assessments,
        AVG(aa.score_percent) as avg_score,
        AVG(TIMESTAMPDIFF(SECOND, aa.started_at, aa.completed_at)) as avg_duration_seconds,
        SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) as passed_count,
        COUNT(aa.id) as total_count
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      JOIN users u ON aa.user_id = u.id
      ${whereClause}
    `,
      params
    );

    res.json({ stats: stats[0] });
  } catch (error) {
    console.error("Get overall stats error:", error);
    next(error);
  }
};

/**
 * Аналитика по филиалам
 */
exports.getBranchAnalytics = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    const attemptConditions = ['aa.status = "completed"'];
    const attemptParams = [];

    if (dateFrom) {
      attemptConditions.push("aa.completed_at >= ?");
      attemptParams.push(dateFrom);
    }

    if (dateTo) {
      attemptConditions.push("aa.completed_at <= ?");
      attemptParams.push(dateTo);
    }

    const attemptConditionsSql = attemptConditions.length > 0 ? ` AND ${attemptConditions.join(" AND ")}` : "";

    const [branches] = await pool.query(
      `
      SELECT 
        b.id,
        b.name as branch_name,
        COUNT(DISTINCT aa.id) as total_attempts,
        COUNT(DISTINCT aa.user_id) as unique_users,
        AVG(aa.score_percent) as avg_score,
        SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) as passed_count,
        COUNT(aa.id) as total_count
      FROM branches b
      LEFT JOIN users u ON b.id = u.branch_id
      LEFT JOIN assessment_attempts aa ON u.id = aa.user_id${attemptConditionsSql}
      LEFT JOIN assessments a ON aa.assessment_id = a.id
      ${userRole === "manager" ? "WHERE b.id = (SELECT branch_id FROM users WHERE id = ?)" : ""}
      GROUP BY b.id
      ORDER BY avg_score DESC
    `,
      userRole === "manager" ? [...attemptParams, userId] : attemptParams
    );

    res.json({ branches });
  } catch (error) {
    console.error("Get branch analytics error:", error);
    next(error);
  }
};

/**
 * Аналитика по должностям
 */
exports.getPositionAnalytics = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, branchId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    const attemptConditions = ['aa.status = "completed"'];
    const attemptParams = [];

    if (dateFrom) {
      attemptConditions.push("aa.completed_at >= ?");
      attemptParams.push(dateFrom);
    }

    if (dateTo) {
      attemptConditions.push("aa.completed_at <= ?");
      attemptParams.push(dateTo);
    }

    const attemptConditionsSql = attemptConditions.length > 0 ? ` AND ${attemptConditions.join(" AND ")}` : "";

    const filters = [];
    const filterParams = [];

    if (userRole === "manager") {
      filters.push("b.id = (SELECT branch_id FROM users WHERE id = ?)");
      filterParams.push(userId);
    }

    if (branchId) {
      filters.push("b.id = ?");
      filterParams.push(branchId);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const [positions] = await pool.query(
      `
      SELECT 
        p.id,
        p.name as position_name,
        COUNT(DISTINCT aa.id) as total_attempts,
        COUNT(DISTINCT aa.user_id) as unique_users,
        AVG(aa.score_percent) as avg_score,
        SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) as passed_count,
        COUNT(aa.id) as total_count
      FROM positions p
      LEFT JOIN users u ON p.id = u.position_id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN assessment_attempts aa ON u.id = aa.user_id${attemptConditionsSql}
      LEFT JOIN assessments a ON aa.assessment_id = a.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY avg_score DESC
    `,
      [...attemptParams, ...filterParams]
    );

    res.json({ positions });
  } catch (error) {
    console.error("Get position analytics error:", error);
    next(error);
  }
};

/**
 * Топ сотрудников
 */
exports.getTopUsers = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, branchId, positionId, limit = 10 } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereConditions = ['aa.status = "completed"'];
    const params = [];

    if (userRole === "manager") {
      whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
      params.push(userId);
    }

    if (dateFrom) {
      whereConditions.push("aa.completed_at >= ?");
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push("aa.completed_at <= ?");
      params.push(dateTo);
    }

    if (branchId) {
      whereConditions.push("u.branch_id = ?");
      params.push(branchId);
    }

    if (positionId) {
      whereConditions.push("u.position_id = ?");
      params.push(positionId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const [users] = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        b.name as branch_name,
        p.name as position_name,
        COUNT(DISTINCT aa.assessment_id) as total_assessments,
        COUNT(aa.id) as total_attempts,
        AVG(aa.score_percent) as avg_score,
        SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) as passed_count
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      JOIN assessment_attempts aa ON u.id = aa.user_id
      JOIN assessments a ON aa.assessment_id = a.id
      ${whereClause}
      GROUP BY u.id
      ORDER BY avg_score DESC, total_assessments DESC
      LIMIT ?
    `,
      [...params, parseInt(limit)]
    );

    res.json({ users });
  } catch (error) {
    console.error("Get top users error:", error);
    next(error);
  }
};

/**
 * Динамика аттестаций по датам
 */
exports.getAssessmentTrends = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, branchId, assessmentId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereConditions = ['aa.status = "completed"'];
    const params = [];

    if (userRole === "manager") {
      whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
      params.push(userId);
    }

    if (dateFrom) {
      whereConditions.push("aa.completed_at >= ?");
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push("aa.completed_at <= ?");
      params.push(dateTo);
    }

    if (branchId) {
      whereConditions.push("u.branch_id = ?");
      params.push(branchId);
    }

    if (assessmentId) {
      whereConditions.push("aa.assessment_id = ?");
      params.push(assessmentId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const [trends] = await pool.query(
      `
      SELECT 
        DATE(aa.completed_at) as date,
        COUNT(aa.id) as attempts_count,
        AVG(aa.score_percent) as avg_score,
        SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) as passed_count
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      JOIN users u ON aa.user_id = u.id
      ${whereClause}
      GROUP BY DATE(aa.completed_at)
      ORDER BY date ASC
    `,
      params
    );

    // Рассчитываем проценты прироста/снижения
    const trendsWithChanges = trends.map((item, index) => {
      if (index === 0) {
        return { ...item, change_percent: 0, change_direction: "neutral" };
      }

      const prevScore = trends[index - 1].avg_score;
      const currentScore = item.avg_score;
      const changePercent = prevScore > 0 ? (((currentScore - prevScore) / prevScore) * 100).toFixed(2) : 0;

      return {
        ...item,
        change_percent: parseFloat(changePercent),
        change_direction: changePercent > 0 ? "positive" : changePercent < 0 ? "negative" : "neutral",
      };
    });

    res.json({ trends: trendsWithChanges });
  } catch (error) {
    console.error("Get assessment trends error:", error);
    next(error);
  }
};

/**
 * Детальная аналитика по филиалам с медианой и долями
 */
exports.getDetailedBranchAnalytics = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    const attemptConditions = ['aa.status = "completed"'];
    const attemptParams = [];

    if (dateFrom) {
      attemptConditions.push("aa.completed_at >= ?");
      attemptParams.push(dateFrom);
    }

    if (dateTo) {
      attemptConditions.push("aa.completed_at <= ?");
      attemptParams.push(dateTo);
    }

    const attemptConditionsSql = attemptConditions.length > 0 ? ` AND ${attemptConditions.join(" AND ")}` : "";

    const [branches] = await pool.query(
      `
      SELECT 
        b.id,
        b.name as branch_name,
        COUNT(DISTINCT aa.id) as total_attempts,
        COUNT(DISTINCT aa.user_id) as unique_users,
        AVG(aa.score_percent) as avg_score,
        SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) as passed_count,
        SUM(CASE WHEN aa.score_percent >= 90 THEN 1 ELSE 0 END) as excellent_count,
        SUM(CASE WHEN aa.score_percent >= a.pass_score_percent AND aa.score_percent < 90 THEN 1 ELSE 0 END) as good_count,
        COUNT(aa.id) as total_count
      FROM branches b
      LEFT JOIN users u ON b.id = u.branch_id
      LEFT JOIN assessment_attempts aa ON u.id = aa.user_id${attemptConditionsSql}
      LEFT JOIN assessments a ON aa.assessment_id = a.id
      ${userRole === "manager" ? "WHERE b.id = (SELECT branch_id FROM users WHERE id = ?)" : ""}
      GROUP BY b.id
      ORDER BY avg_score DESC
    `,
      userRole === "manager" ? [...attemptParams, userId] : attemptParams
    );

    // Рассчитываем медиану и доли для каждого филиала
    const detailedBranches = await Promise.all(
      branches.map(async (branch) => {
        if (branch.total_attempts > 0) {
          // Получаем медиану
          const [medianResult] = await pool.query(
            `
            SELECT aa.score_percent
            FROM assessment_attempts aa
            JOIN users u ON aa.user_id = u.id
            WHERE u.branch_id = ? AND aa.status = 'completed'
            ${dateFrom ? "AND aa.completed_at >= ?" : ""}
            ${dateTo ? "AND aa.completed_at <= ?" : ""}
            ORDER BY aa.score_percent
            LIMIT 1 OFFSET ?
          `,
            [branch.id, ...(dateFrom ? [dateFrom] : []), ...(dateTo ? [dateTo] : []), Math.floor(branch.total_attempts / 2)]
          );

          return {
            ...branch,
            median_score: medianResult[0]?.score_percent || 0,
            excellent_percent: ((branch.excellent_count / branch.total_count) * 100).toFixed(2),
            good_percent: ((branch.good_count / branch.total_count) * 100).toFixed(2),
            pass_percent: ((branch.passed_count / branch.total_count) * 100).toFixed(2),
          };
        }
        return branch;
      })
    );

    res.json({ branches: detailedBranches });
  } catch (error) {
    console.error("Get detailed branch analytics error:", error);
    next(error);
  }
};

/**
 * Комбинированная аналитика: филиалы + должности
 */
exports.getCombinedAnalytics = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, branchId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    const attemptConditions = ['aa.status = "completed"'];
    const attemptParams = [];

    if (dateFrom) {
      attemptConditions.push("aa.completed_at >= ?");
      attemptParams.push(dateFrom);
    }

    if (dateTo) {
      attemptConditions.push("aa.completed_at <= ?");
      attemptParams.push(dateTo);
    }

    const attemptConditionsSql = attemptConditions.length > 0 ? ` AND ${attemptConditions.join(" AND ")}` : "";

    const filters = [];
    const filterParams = [];

    if (userRole === "manager") {
      filters.push("b.id = (SELECT branch_id FROM users WHERE id = ?)");
      filterParams.push(userId);
    }

    if (branchId) {
      filters.push("b.id = ?");
      filterParams.push(branchId);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const [combined] = await pool.query(
      `
      SELECT 
        b.id as branch_id,
        b.name as branch_name,
        p.id as position_id,
        p.name as position_name,
        COUNT(DISTINCT aa.id) as total_attempts,
        AVG(aa.score_percent) as avg_score,
        SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) as passed_count,
        COUNT(aa.id) as total_count
      FROM branches b
      CROSS JOIN positions p
      LEFT JOIN users u ON b.id = u.branch_id AND p.id = u.position_id
      LEFT JOIN assessment_attempts aa ON u.id = aa.user_id${attemptConditionsSql}
      LEFT JOIN assessments a ON aa.assessment_id = a.id
      ${whereClause}
      GROUP BY b.id, p.id
      HAVING total_attempts > 0
      ORDER BY b.name, p.name
    `,
      [...attemptParams, ...filterParams]
    );

    res.json({ combined });
  } catch (error) {
    console.error("Get combined analytics error:", error);
    next(error);
  }
};

/**
 * Отчёт по конкретной аттестации
 */
exports.getAssessmentReport = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Основная информация об аттестации
    const [assessments] = await pool.query(
      `
    SELECT 
      a.*,
      b.name as branch_name,
      (SELECT COUNT(*) FROM assessment_attempts WHERE assessment_id = a.id AND status = 'completed') as completed_count,
      (SELECT AVG(score_percent) FROM assessment_attempts WHERE assessment_id = a.id AND status = 'completed') as avg_score,
      (SELECT COUNT(*) FROM assessment_attempts WHERE assessment_id = a.id AND status = 'completed' AND score_percent >= a.pass_score_percent) as passed_count
    FROM assessments a
    LEFT JOIN branches b ON a.branch_id = b.id
    WHERE a.id = ?
  `,
      [assessmentId]
    );

    if (assessments.length === 0) {
      return res.status(404).json({ error: "Аттестация не найдена" });
    }

    const assessment = assessments[0];

    // Проверка прав доступа
    if (userRole === "manager") {
      const [userBranch] = await pool.query("SELECT branch_id FROM users WHERE id = ?", [userId]);
      if (userBranch[0].branch_id !== assessment.branch_id) {
        return res.status(403).json({ error: "Нет доступа к этой аттестации" });
      }
    }

    // Участники с результатами
    const [participants] = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.avatar_url,
        b.name as branch_name,
        p.name as position_name,
        aa.score_percent,
        aa.status,
        aa.started_at,
        aa.completed_at,
        TIMESTAMPDIFF(SECOND, aa.started_at, aa.completed_at) as duration_seconds
      FROM assessment_attempts aa
      JOIN users u ON aa.user_id = u.id
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE aa.assessment_id = ?
      ORDER BY aa.score_percent DESC, aa.completed_at ASC
    `,
      [assessmentId]
    );

    // Статистика по вопросам
    const [questionStats] = await pool.query(
      `
      SELECT 
        q.id,
        q.question_text,
        q.question_type,
        COUNT(DISTINCT aa.id) as total_answers,
        SUM(CASE WHEN aua.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
        ROUND((SUM(CASE WHEN aua.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(DISTINCT aa.id)) * 100, 2) as correct_percent
      FROM questions q
      JOIN assessment_questions aq ON q.id = aq.question_id
      JOIN assessment_attempts aa ON aq.assessment_id = aa.assessment_id
      LEFT JOIN assessment_user_answers aua ON q.id = aua.question_id AND aa.id = aua.attempt_id
      WHERE aq.assessment_id = ? AND aa.status = 'completed'
      GROUP BY q.id
      ORDER BY correct_percent ASC
    `,
      [assessmentId]
    );

    res.json({
      assessment,
      participants,
      questionStats,
      summary: {
        total_participants: participants.length,
        completed_count: assessment.completed_count,
        avg_score: assessment.avg_score,
        passed_count: assessment.passed_count,
        pass_percent: assessment.completed_count > 0 ? ((assessment.passed_count / assessment.completed_count) * 100).toFixed(2) : 0,
      },
    });
  } catch (error) {
    console.error("Get assessment report error:", error);
    next(error);
  }
};

/**
 * Отчёт по конкретному пользователю
 */
exports.getUserReport = async (req, res, next) => {
  try {
    const { userId: targetUserId } = req.params;
    const { dateFrom, dateTo } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Получаем информацию о пользователе
    let users;
    try {
      [users] = await pool.query(
        `
        SELECT 
          u.*,
          b.name as branch_name,
          p.name as position_name,
          l.name as level_name
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        LEFT JOIN positions p ON u.position_id = p.id
        LEFT JOIN levels l ON u.level_id = l.id
        WHERE u.id = ?
      `,
        [targetUserId]
      );
    } catch (error) {
      if (error.code === "ER_NO_SUCH_TABLE" && error.message.includes("levels")) {
        [users] = await pool.query(
          `
          SELECT 
            u.*,
            b.name as branch_name,
            p.name as position_name,
            NULL as level_name
          FROM users u
          LEFT JOIN branches b ON u.branch_id = b.id
          LEFT JOIN positions p ON u.position_id = p.id
          WHERE u.id = ?
        `,
          [targetUserId]
        );
      } else {
        throw error;
      }
    }

    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const user = users[0];

    // Проверка прав доступа
    if (userRole === "manager") {
      const [userBranch] = await pool.query("SELECT branch_id FROM users WHERE id = ?", [userId]);
      const managerBranchId = userBranch[0]?.branch_id;

      if (!managerBranchId) {
        return res.status(403).json({ error: "Нет доступа к этому пользователю" });
      }

      if (managerBranchId !== user.branch_id) {
        return res.status(403).json({ error: "Нет доступа к этому пользователю" });
      }
    }

    let dateCondition = "";
    const params = [targetUserId];

    if (dateFrom) {
      dateCondition += " AND aa.completed_at >= ?";
      params.push(dateFrom);
    }

    if (dateTo) {
      dateCondition += " AND aa.completed_at <= ?";
      params.push(dateTo);
    }

    // Статистика по аттестациям
    const [stats] = await pool.query(
      `
      SELECT 
        COUNT(aa.id) as total_attempts,
        AVG(aa.score_percent) as avg_score,
        MAX(aa.score_percent) as max_score,
        MIN(aa.score_percent) as min_score,
        SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) as passed_count
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE aa.user_id = ? AND aa.status = 'completed'${dateCondition}
    `,
      params
    );

    // История аттестаций
    const [attempts] = await pool.query(
      `
      SELECT 
        a.id as assessment_id,
        a.title as assessment_title,
        aa.score_percent,
        aa.completed_at,
        CASE WHEN aa.score_percent >= a.pass_score_percent THEN 'Пройдено' ELSE 'Не пройдено' END as status
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE aa.user_id = ? AND aa.status = 'completed'${dateCondition}
      ORDER BY aa.completed_at DESC
    `,
      params
    );

    // Динамика результатов
    const [trends] = await pool.query(
      `
      SELECT 
        DATE(aa.completed_at) as date,
        AVG(aa.score_percent) as avg_score
      FROM assessment_attempts aa
      WHERE aa.user_id = ? AND aa.status = 'completed'${dateCondition}
      GROUP BY DATE(aa.completed_at)
      ORDER BY date ASC
    `,
      params
    );

    // Сравнение с коллегами того же уровня/должности
    const [comparison] = await pool.query(
      `
      SELECT 
        AVG(aa.score_percent) as avg_score_peers,
        COUNT(DISTINCT aa.user_id) as total_peers
      FROM assessment_attempts aa
      JOIN users u ON aa.user_id = u.id
      WHERE u.position_id = ? AND u.id != ? AND aa.status = 'completed'${dateCondition}
    `,
      [user.position_id, targetUserId, ...(dateFrom ? [dateFrom] : []), ...(dateTo ? [dateTo] : [])]
    );

    res.json({
      user,
      stats: stats[0],
      attempts,
      trends,
      comparison: comparison[0],
    });
  } catch (error) {
    console.error("Get user report error:", error);
    next(error);
  }
};

/**
 * Экспорт в Excel
 */
exports.exportToExcel = async (req, res, next) => {
  try {
    const { type, dateFrom, dateTo, branchId, positionId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Assessment System";
    workbook.created = new Date();

    if (type === "branches") {
      // Экспорт аналитики по филиалам
      const sheet = workbook.addWorksheet("Филиалы");

      let whereConditions = ['aa.status = "completed"'];
      const params = [];

      if (userRole === "manager") {
        whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
        params.push(userId);
      }

      if (dateFrom) {
        whereConditions.push("aa.completed_at >= ?");
        params.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push("aa.completed_at <= ?");
        params.push(dateTo);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      const [branches] = await pool.query(
        `
        SELECT 
          b.name as 'Филиал',
          COUNT(DISTINCT aa.id) as 'Всего попыток',
          COUNT(DISTINCT aa.user_id) as 'Уникальных пользователей',
          ROUND(AVG(aa.score_percent), 2) as 'Средний балл',
          SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) as 'Прошли',
          ROUND((SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) / COUNT(aa.id)) * 100, 2) as 'Процент успеха'
        FROM branches b
        LEFT JOIN users u ON b.id = u.branch_id
        LEFT JOIN assessment_attempts aa ON u.id = aa.user_id ${whereConditions.length > 0 ? "AND " + whereConditions.slice(1).join(" AND ") : ""}
        LEFT JOIN assessments a ON aa.assessment_id = a.id
        ${userRole === "manager" ? "WHERE b.id = (SELECT branch_id FROM users WHERE id = ?)" : ""}
        GROUP BY b.id
      `,
        userRole === "manager" ? [userId] : []
      );

      sheet.columns = Object.keys(branches[0] || {}).map((key) => ({ header: key, key, width: 20 }));
      sheet.addRows(branches);

      // Стилизация заголовков
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      sheet.getRow(1).font.color = { argb: "FFFFFFFF" };
    } else if (type === "users") {
      // Экспорт по пользователям
      const sheet = workbook.addWorksheet("Сотрудники");

      let whereConditions = ['aa.status = "completed"'];
      const params = [];

      if (userRole === "manager") {
        whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
        params.push(userId);
      }

      if (dateFrom) {
        whereConditions.push("aa.completed_at >= ?");
        params.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push("aa.completed_at <= ?");
        params.push(dateTo);
      }

      if (branchId) {
        whereConditions.push("u.branch_id = ?");
        params.push(branchId);
      }

      if (positionId) {
        whereConditions.push("u.position_id = ?");
        params.push(positionId);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      const [users] = await pool.query(
        `
        SELECT 
          u.first_name as 'Имя',
          u.last_name as 'Фамилия',
          b.name as 'Филиал',
          p.name as 'Должность',
          COUNT(DISTINCT aa.assessment_id) as 'Пройдено аттестаций',
          COUNT(aa.id) as 'Всего попыток',
          ROUND(AVG(aa.score_percent), 2) as 'Средний балл',
          SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) as 'Прошли'
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        LEFT JOIN positions p ON u.position_id = p.id
        JOIN assessment_attempts aa ON u.id = aa.user_id
        JOIN assessments a ON aa.assessment_id = a.id
        ${whereClause}
        GROUP BY u.id
        ORDER BY AVG(aa.score_percent) DESC
      `,
        params
      );

      sheet.columns = Object.keys(users[0] || {}).map((key) => ({ header: key, key, width: 20 }));
      sheet.addRows(users);

      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      sheet.getRow(1).font.color = { argb: "FFFFFFFF" };
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=report_${type}_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export to Excel error:", error);
    next(error);
  }
};

/**
 * Экспорт в PDF
 */
exports.exportToPDF = async (req, res, next) => {
  try {
    const { type, dateFrom, dateTo, branchId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=report_${type}_${Date.now()}.pdf`);

    doc.pipe(res);

    // Заголовок
    doc.fontSize(20).text("Отчёт по аттестациям", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`, { align: "center" });
    doc.moveDown(2);

    if (type === "branches") {
      let whereConditions = ['aa.status = "completed"'];
      const params = [];

      if (userRole === "manager") {
        whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
        params.push(userId);
      }

      if (dateFrom) {
        whereConditions.push("aa.completed_at >= ?");
        params.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push("aa.completed_at <= ?");
        params.push(dateTo);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      const [branches] = await pool.query(
        `
        SELECT 
          b.name,
          COUNT(DISTINCT aa.id) as total_attempts,
          ROUND(AVG(aa.score_percent), 2) as avg_score,
          SUM(CASE WHEN aa.score_percent >= a.pass_score_percent THEN 1 ELSE 0 END) as passed_count,
          COUNT(aa.id) as total_count
        FROM branches b
        LEFT JOIN users u ON b.id = u.branch_id
        LEFT JOIN assessment_attempts aa ON u.id = aa.user_id ${whereConditions.length > 0 ? "AND " + whereConditions.slice(1).join(" AND ") : ""}
        LEFT JOIN assessments a ON aa.assessment_id = a.id
        ${userRole === "manager" ? "WHERE b.id = (SELECT branch_id FROM users WHERE id = ?)" : ""}
        GROUP BY b.id
      `,
        userRole === "manager" ? [userId] : []
      );

      doc.fontSize(16).text("Статистика по филиалам", { underline: true });
      doc.moveDown();

      branches.forEach((branch, index) => {
        doc.fontSize(12).text(`${index + 1}. ${branch.name}`, { bold: true });
        doc.fontSize(10).text(`   Всего попыток: ${branch.total_attempts}`);
        doc.text(`   Средний балл: ${branch.avg_score}%`);
        doc.text(`   Прошли: ${branch.passed_count} из ${branch.total_count}`);
        doc.moveDown();
      });
    }

    doc.end();
  } catch (error) {
    console.error("Export to PDF error:", error);
    next(error);
  }
};
