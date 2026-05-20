const { pool } = require("../../../config/database");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const ACTIVE_USER_CONDITION = "u.deleted_at IS NULL AND COALESCE(u.is_active, 1) = 1";

/**
 * Получить общую статистику
 */
exports.getOverallStats = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, branchId, positionId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereConditions = ["1=1", ACTIVE_USER_CONDITION];
    const params = [];

    if (userRole === "manager") {
      whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
      params.push(userId);
    }

    if (dateFrom) {
      whereConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?");
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?");
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

    const [stats] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT cup.id) as total_attempts,
        COUNT(DISTINCT cup.user_id) as unique_users,
        COUNT(DISTINCT cup.course_id) as unique_assessments,
        AVG(cup.progress_percent) as avg_score,
        AVG(TIMESTAMPDIFF(SECOND, cup.started_at, cup.completed_at)) as avg_duration_seconds,
        SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as passed_count,
        COUNT(cup.id) as total_count
      FROM course_user_progress cup
      JOIN users u ON cup.user_id = u.id
      ${whereClause}
    `,
      params,
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

    const attemptConditions = ["1=1"];
    const attemptParams = [];

    if (dateFrom) {
      attemptConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?");
      attemptParams.push(dateFrom);
    }

    if (dateTo) {
      attemptConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?");
      attemptParams.push(dateTo);
    }

    const attemptConditionsSql = attemptConditions.length > 0 ? ` AND ${attemptConditions.join(" AND ")}` : "";

    const [branches] = await pool.query(
      `
      SELECT 
        b.id,
        b.name as branch_name,
        COUNT(DISTINCT cup.id) as total_attempts,
        COUNT(DISTINCT cup.user_id) as unique_users,
        AVG(cup.progress_percent) as avg_score,
        SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as passed_count,
        COUNT(cup.id) as total_count
      FROM branches b
      LEFT JOIN users u ON b.id = u.branch_id AND ${ACTIVE_USER_CONDITION}
      LEFT JOIN course_user_progress cup ON u.id = cup.user_id${attemptConditionsSql}
      ${userRole === "manager" ? "WHERE b.id = (SELECT branch_id FROM users WHERE id = ?)" : ""}
      GROUP BY b.id
      ORDER BY avg_score DESC
    `,
      userRole === "manager" ? [...attemptParams, userId] : attemptParams,
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

    const attemptConditions = ["1=1"];
    const attemptParams = [];

    if (dateFrom) {
      attemptConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?");
      attemptParams.push(dateFrom);
    }

    if (dateTo) {
      attemptConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?");
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
        COUNT(DISTINCT cup.id) as total_attempts,
        COUNT(DISTINCT cup.user_id) as unique_users,
        AVG(cup.progress_percent) as avg_score,
        SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as passed_count,
        COUNT(cup.id) as total_count
      FROM positions p
      LEFT JOIN users u ON p.id = u.position_id AND ${ACTIVE_USER_CONDITION}
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN course_user_progress cup ON u.id = cup.user_id${attemptConditionsSql}
      ${whereClause}
      GROUP BY p.id
      ORDER BY avg_score DESC
    `,
      [...attemptParams, ...filterParams],
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

    let whereConditions = ["1=1", ACTIVE_USER_CONDITION];
    const params = [];

    if (userRole === "manager") {
      whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
      params.push(userId);
    }

    if (dateFrom) {
      whereConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?");
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?");
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
        SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as total_assessments,
        COUNT(cup.id) as total_attempts,
        AVG(cup.progress_percent) as avg_score,
        SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as passed_count
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      JOIN course_user_progress cup ON u.id = cup.user_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY avg_score DESC, total_assessments DESC
      LIMIT ?
    `,
      [...params, parseInt(limit)],
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
    const { dateFrom, dateTo, branchId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    let whereConditions = ["cup.completed_at IS NOT NULL", ACTIVE_USER_CONDITION];
    const params = [];

    if (userRole === "manager") {
      whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
      params.push(userId);
    }

    if (dateFrom) {
      whereConditions.push("cup.completed_at >= ?");
      params.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push("cup.completed_at <= ?");
      params.push(dateTo);
    }

    if (branchId) {
      whereConditions.push("u.branch_id = ?");
      params.push(branchId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const [trends] = await pool.query(
      `
      SELECT 
        DATE(cup.completed_at) as date,
        COUNT(cup.id) as attempts_count,
        AVG(cup.progress_percent) as avg_score,
        COUNT(cup.id) as passed_count
      FROM course_user_progress cup
      JOIN users u ON cup.user_id = u.id
      ${whereClause}
      GROUP BY DATE(cup.completed_at)
      ORDER BY date ASC
    `,
      params,
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

    const attemptConditions = ["1=1"];
    const attemptParams = [];

    if (dateFrom) {
      attemptConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?");
      attemptParams.push(dateFrom);
    }

    if (dateTo) {
      attemptConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?");
      attemptParams.push(dateTo);
    }

    const attemptConditionsSql = attemptConditions.length > 0 ? ` AND ${attemptConditions.join(" AND ")}` : "";

    const [branches] = await pool.query(
      `
      SELECT 
        b.id,
        b.name as branch_name,
        COUNT(DISTINCT cup.id) as total_attempts,
        COUNT(DISTINCT cup.user_id) as unique_users,
        AVG(cup.progress_percent) as avg_score,
        SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as passed_count,
        SUM(CASE WHEN cup.status = 'completed' AND cup.progress_percent >= 90 THEN 1 ELSE 0 END) as excellent_count,
        SUM(CASE WHEN cup.status = 'completed' AND cup.progress_percent >= 70 AND cup.progress_percent < 90 THEN 1 ELSE 0 END) as good_count,
        COUNT(cup.id) as total_count
      FROM branches b
      LEFT JOIN users u ON b.id = u.branch_id AND ${ACTIVE_USER_CONDITION}
      LEFT JOIN course_user_progress cup ON u.id = cup.user_id${attemptConditionsSql}
      ${userRole === "manager" ? "WHERE b.id = (SELECT branch_id FROM users WHERE id = ?)" : ""}
      GROUP BY b.id
      ORDER BY avg_score DESC
    `,
      userRole === "manager" ? [...attemptParams, userId] : attemptParams,
    );

    // Рассчитываем медиану и доли для каждого филиала
    const detailedBranches = await Promise.all(
      branches.map(async (branch) => {
        if (branch.total_attempts > 0) {
          // Получаем медиану
          const [medianResult] = await pool.query(
            `
            SELECT cup.progress_percent
            FROM course_user_progress cup
            JOIN users u ON cup.user_id = u.id
            WHERE u.branch_id = ? AND cup.status = 'completed' AND ${ACTIVE_USER_CONDITION}
            ${dateFrom ? "AND cup.completed_at >= ?" : ""}
            ${dateTo ? "AND cup.completed_at <= ?" : ""}
            ORDER BY cup.progress_percent
            LIMIT 1 OFFSET ?
          `,
            [branch.id, ...(dateFrom ? [dateFrom] : []), ...(dateTo ? [dateTo] : []), Math.floor(branch.total_attempts / 2)],
          );

          return {
            ...branch,
            median_score: medianResult[0]?.progress_percent || 0,
            excellent_percent: ((branch.excellent_count / branch.total_count) * 100).toFixed(2),
            good_percent: ((branch.good_count / branch.total_count) * 100).toFixed(2),
            pass_percent: ((branch.passed_count / branch.total_count) * 100).toFixed(2),
          };
        }
        return branch;
      }),
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

    const attemptConditions = ["1=1"];
    const attemptParams = [];

    if (dateFrom) {
      attemptConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?");
      attemptParams.push(dateFrom);
    }

    if (dateTo) {
      attemptConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?");
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
        COUNT(DISTINCT cup.id) as total_attempts,
        AVG(cup.progress_percent) as avg_score,
        SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as passed_count,
        COUNT(cup.id) as total_count
      FROM branches b
      CROSS JOIN positions p
      LEFT JOIN users u ON b.id = u.branch_id AND p.id = u.position_id AND ${ACTIVE_USER_CONDITION}
      LEFT JOIN course_user_progress cup ON u.id = cup.user_id${attemptConditionsSql}
      ${whereClause}
      GROUP BY b.id, p.id
      HAVING total_attempts > 0
      ORDER BY b.name, p.name
    `,
      [...attemptParams, ...filterParams],
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

    // Для совместимости роут оставляем прежним, но считаем отчет по курсу.
    const courseId = Number(assessmentId);
    const [courses] = await pool.query(
      `
    SELECT 
      c.id,
      c.title,
      c.status,
      (SELECT COUNT(*) FROM course_user_progress WHERE course_id = c.id) as total_count,
      (SELECT COUNT(*) FROM course_user_progress WHERE course_id = c.id AND status = 'completed') as completed_count,
      (SELECT AVG(progress_percent) FROM course_user_progress WHERE course_id = c.id) as avg_score
    FROM courses c
    WHERE c.id = ?
  `,
      [courseId],
    );

    if (courses.length === 0) {
      return res.status(404).json({ error: "Курс не найден" });
    }

    const course = courses[0];

    // Проверка прав доступа по филиалу для manager
    if (userRole === "manager") {
      const [managerRows] = await pool.query("SELECT branch_id FROM users WHERE id = ?", [userId]);
      const managerBranchId = managerRows?.[0]?.branch_id;
      const [courseBranches] = await pool.query(
        `
        SELECT DISTINCT u.branch_id
        FROM course_user_progress cup
        JOIN users u ON u.id = cup.user_id
        WHERE cup.course_id = ? AND u.branch_id IS NOT NULL
        LIMIT 1
      `,
        [courseId],
      );

      const courseBranchId = courseBranches?.[0]?.branch_id || null;
      if (!managerBranchId || (courseBranchId && Number(managerBranchId) !== Number(courseBranchId))) {
        return res.status(403).json({ error: "Нет доступа к этому курсу" });
      }
    }

    // Участники с прогрессом по курсу
    const [participants] = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.avatar_url,
        b.name as branch_name,
        p.name as position_name,
        cup.progress_percent as score_percent,
        cup.status,
        cup.started_at,
        cup.completed_at,
        TIMESTAMPDIFF(SECOND, cup.started_at, cup.completed_at) as duration_seconds
      FROM course_user_progress cup
      JOIN users u ON cup.user_id = u.id
      AND ${ACTIVE_USER_CONDITION}
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE cup.course_id = ?
      ORDER BY cup.progress_percent DESC, cup.completed_at ASC
    `,
      [courseId],
    );

    // Для совместимости структуры оставляем questionStats пустым.
    const questionStats = [];

    res.json({
      assessment: course,
      participants,
      questionStats,
      summary: {
        total_participants: participants.length,
        completed_count: Number(course.completed_count || 0),
        avg_score: course.avg_score,
        passed_count: Number(course.completed_count || 0),
        pass_percent:
          Number(course.total_count || 0) > 0 ? ((Number(course.completed_count || 0) / Number(course.total_count || 0)) * 100).toFixed(2) : 0,
      },
    });
  } catch (error) {
    console.error("Get course report error:", error);
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
        [targetUserId],
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
          [targetUserId],
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
      dateCondition += " AND COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?";
      params.push(dateFrom);
    }

    if (dateTo) {
      dateCondition += " AND COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?";
      params.push(dateTo);
    }

    // Статистика по курсам
    const [stats] = await pool.query(
      `
      SELECT 
        COUNT(cup.id) as total_attempts,
        AVG(cup.progress_percent) as avg_score,
        MAX(cup.progress_percent) as max_score,
        MIN(cup.progress_percent) as min_score,
        SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as passed_count
      FROM course_user_progress cup
      WHERE cup.user_id = ?${dateCondition}
    `,
      params,
    );

    // История курсов
    const [attempts] = await pool.query(
      `
      SELECT 
        c.id as assessment_id,
        c.title as assessment_title,
        cup.progress_percent as score_percent,
        COALESCE(cup.completed_at, cup.updated_at, cup.created_at) as completed_at,
        CASE WHEN cup.status = 'completed' THEN 'Пройдено' ELSE 'В процессе' END as status
      FROM course_user_progress cup
      JOIN courses c ON c.id = cup.course_id
      WHERE cup.user_id = ?${dateCondition}
      ORDER BY COALESCE(cup.completed_at, cup.updated_at, cup.created_at) DESC
    `,
      params,
    );

    // Динамика результатов
    const [trends] = await pool.query(
      `
      SELECT 
        DATE(COALESCE(cup.completed_at, cup.updated_at, cup.created_at)) as date,
        AVG(cup.progress_percent) as avg_score
      FROM course_user_progress cup
      WHERE cup.user_id = ?${dateCondition}
      GROUP BY DATE(COALESCE(cup.completed_at, cup.updated_at, cup.created_at))
      ORDER BY date ASC
    `,
      params,
    );

    // Сравнение с коллегами того же уровня/должности
    const [comparison] = await pool.query(
      `
      SELECT 
        AVG(cup.progress_percent) as avg_score_peers,
        COUNT(DISTINCT cup.user_id) as total_peers
      FROM course_user_progress cup
      JOIN users u ON cup.user_id = u.id
      WHERE u.position_id = ? AND u.id != ? AND ${ACTIVE_USER_CONDITION}
      ${dateFrom ? "AND COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?" : ""}
      ${dateTo ? "AND COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?" : ""}
    `,
      [user.position_id, targetUserId, ...(dateFrom ? [dateFrom] : []), ...(dateTo ? [dateTo] : [])],
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

      let whereConditions = ["1=1", ACTIVE_USER_CONDITION];
      const params = [];

      if (userRole === "manager") {
        whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
        params.push(userId);
      }

      if (dateFrom) {
        whereConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?");
        params.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?");
        params.push(dateTo);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      const [branches] = await pool.query(
        `
        SELECT 
          b.name as 'Филиал',
          COUNT(DISTINCT cup.id) as 'Всего курсов',
          COUNT(DISTINCT cup.user_id) as 'Уникальных пользователей',
          ROUND(AVG(cup.progress_percent), 2) as 'Средний прогресс',
          SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as 'Завершено',
          ROUND((SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) / COUNT(cup.id)) * 100, 2) as 'Процент успеха'
        FROM branches b
        LEFT JOIN users u ON b.id = u.branch_id AND ${ACTIVE_USER_CONDITION}
        LEFT JOIN course_user_progress cup ON u.id = cup.user_id ${whereConditions.length > 0 ? "AND " + whereConditions.slice(1).join(" AND ") : ""}
        ${userRole === "manager" ? "WHERE b.id = (SELECT branch_id FROM users WHERE id = ?)" : ""}
        GROUP BY b.id
      `,
        userRole === "manager" ? [userId] : [],
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

      let whereConditions = ["1=1", ACTIVE_USER_CONDITION];
      const params = [];

      if (userRole === "manager") {
        whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
        params.push(userId);
      }

      if (dateFrom) {
        whereConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?");
        params.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?");
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
          SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as 'Завершено курсов',
          COUNT(cup.id) as 'Всего курсов',
          ROUND(AVG(cup.progress_percent), 2) as 'Средний прогресс',
          SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as 'Успешно завершено'
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        LEFT JOIN positions p ON u.position_id = p.id
        JOIN course_user_progress cup ON u.id = cup.user_id
        ${whereClause}
        GROUP BY u.id
        ORDER BY AVG(cup.progress_percent) DESC
      `,
        params,
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
    doc.fontSize(20).text("Отчёт по курсам", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`, { align: "center" });
    doc.moveDown(2);

    if (type === "branches") {
      let whereConditions = ["1=1", ACTIVE_USER_CONDITION];
      const params = [];

      if (userRole === "manager") {
        whereConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
        params.push(userId);
      }

      if (dateFrom) {
        whereConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?");
        params.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?");
        params.push(dateTo);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      const [branches] = await pool.query(
        `
        SELECT 
          b.name,
          COUNT(DISTINCT cup.id) as total_attempts,
          ROUND(AVG(cup.progress_percent), 2) as avg_score,
          SUM(CASE WHEN cup.status = 'completed' THEN 1 ELSE 0 END) as passed_count,
          COUNT(cup.id) as total_count
        FROM branches b
        LEFT JOIN users u ON b.id = u.branch_id AND ${ACTIVE_USER_CONDITION}
        LEFT JOIN course_user_progress cup ON u.id = cup.user_id ${whereConditions.length > 0 ? "AND " + whereConditions.slice(1).join(" AND ") : ""}
        ${userRole === "manager" ? "WHERE b.id = (SELECT branch_id FROM users WHERE id = ?)" : ""}
        GROUP BY b.id
      `,
        userRole === "manager" ? [userId] : [],
      );

      doc.fontSize(16).text("Статистика по филиалам", { underline: true });
      doc.moveDown();

      branches.forEach((branch, index) => {
        doc.fontSize(12).text(`${index + 1}. ${branch.name}`, { bold: true });
        doc.fontSize(10).text(`   Всего курсов: ${branch.total_attempts}`);
        doc.text(`   Средний прогресс: ${branch.avg_score}%`);
        doc.text(`   Завершено: ${branch.passed_count} из ${branch.total_count}`);
        doc.moveDown();
      });
    }

    doc.end();
  } catch (error) {
    console.error("Export to PDF error:", error);
    next(error);
  }
};

/**
 * Причины провалов: таймаут vs неверные ответы
 */
exports.getFailureReasons = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, branchId } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    const where = ["1=1", ACTIVE_USER_CONDITION];
    const params = [];

    if (dateFrom) {
      where.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push("COALESCE(cup.completed_at, cup.updated_at, cup.created_at) <= ?");
      params.push(dateTo);
    }
    if (userRole === "manager") {
      where.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
      params.push(userId);
    } else if (branchId) {
      where.push("u.branch_id = ?");
      params.push(Number(branchId));
    }

    const [rows] = await pool.query(
      `
      SELECT
        SUM(CASE WHEN cup.status = 'closed' THEN 1 ELSE 0 END) AS timeout_count,
        SUM(CASE WHEN cup.status IN ('not_started','in_progress') THEN 1 ELSE 0 END) AS wrong_answers_count,
        SUM(CASE WHEN cup.status <> 'completed' THEN 1 ELSE 0 END) AS total_failed
      FROM course_user_progress cup
      JOIN users u ON u.id = cup.user_id
      WHERE ${where.join(" AND ")}
      `,
      params,
    );

    const timeoutCount = Number(rows?.[0]?.timeout_count || 0);
    const wrongAnswersCount = Number(rows?.[0]?.wrong_answers_count || 0);
    const totalFailed = Number(rows?.[0]?.total_failed || 0);

    const toPercent = (value) => (totalFailed > 0 ? Number(((value / totalFailed) * 100).toFixed(1)) : 0);

    res.json({
      totalFailed,
      timeout: {
        count: timeoutCount,
        percent: toPercent(timeoutCount),
      },
      wrongAnswers: {
        count: wrongAnswersCount,
        percent: toPercent(wrongAnswersCount),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.exportToCsv = async (req, res, next) => {
  try {
    const { type = "users", dateFrom, dateTo } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Исключаем итоговые аттестации курсов из CSV-экспорта
    let whereConditions = [
      'aa.status = "completed"',
      ACTIVE_USER_CONDITION,
      "aa.assessment_id NOT IN (SELECT final_assessment_id FROM courses WHERE final_assessment_id IS NOT NULL)",
    ];
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

    let rows = [];
    if (type === "branches") {
      [rows] = await pool.query(
        `
        SELECT b.name AS branch_name,
               COUNT(DISTINCT aa.id) AS attempts,
               ROUND(AVG(aa.score_percent), 2) AS avg_score
        FROM branches b
        LEFT JOIN users u ON u.branch_id = b.id AND ${ACTIVE_USER_CONDITION}
        LEFT JOIN assessment_attempts aa ON aa.user_id = u.id
        LEFT JOIN assessments a ON a.id = aa.assessment_id
        WHERE ${whereConditions.join(" AND ")}
        GROUP BY b.id, b.name
        ORDER BY b.name ASC
        `,
        params,
      );
    } else {
      [rows] = await pool.query(
        `
        SELECT u.id,
               u.first_name,
               u.last_name,
               COUNT(DISTINCT aa.id) AS attempts,
               ROUND(AVG(aa.score_percent), 2) AS avg_score
        FROM users u
        JOIN assessment_attempts aa ON aa.user_id = u.id
        JOIN assessments a ON a.id = aa.assessment_id
        WHERE ${whereConditions.join(" AND ")}
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY u.id ASC
        `,
        params,
      );
    }

    const headers = rows.length ? Object.keys(rows[0]) : ["empty"];
    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(",")];
    for (const row of rows) {
      lines.push(headers.map((key) => escape(row[key])).join(","));
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=analytics_${type}_${Date.now()}.csv`);
    res.send(`${lines.join("\n")}\n`);
  } catch (error) {
    next(error);
  }
};
