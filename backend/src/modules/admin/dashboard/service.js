const { pool } = require("../../../config/database");

/**
 * РџРѕР»СѓС‡РёС‚СЊ РјРµС‚СЂРёРєРё РґР»СЏ Dashboard СЃ С„РёР»СЊС‚СЂР°РјРё
 */
exports.getMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Р¤РёР»СЊС‚СЂС‹ РёР· query params
    const {
      period = "week", // week, month, quarter, custom
      date_from,
      date_to,
      branch_id,
      position_id,
      assessment_type,
    } = req.query;

    const branchFilter = branch_id ? Number(branch_id) : null;
    const positionFilter = position_id ? Number(position_id) : null;

    // РћРїСЂРµРґРµР»СЏРµРј РґРёР°РїР°Р·РѕРЅ РґР°С‚ РЅР° РѕСЃРЅРѕРІРµ РїРµСЂРёРѕРґР°
    let dateFrom, dateTo;
    const now = new Date();

    if (period === "week") {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "month") {
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "quarter") {
      dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "custom" && date_from && date_to) {
      dateFrom = new Date(date_from);
      dateTo = new Date(date_to);
    } else {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateTo = now;
    }

    // РџСЂРµРґС‹РґСѓС‰РёР№ РїРµСЂРёРѕРґ РґР»СЏ СЃСЂР°РІРЅРµРЅРёСЏ
    const periodLength = dateTo - dateFrom;
    const prevDateFrom = new Date(dateFrom.getTime() - periodLength);
    const prevDateTo = new Date(dateFrom.getTime());

    // Р‘Р°Р·РѕРІС‹Рµ СѓСЃР»РѕРІРёСЏ РґР»СЏ С„РёР»СЊС‚СЂРѕРІ
    let filterConditions = [];
    let filterParams = [];
    let prevFilterParams = [];

    if (userRole === "manager") {
      filterConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
      filterParams.push(userId);
      prevFilterParams.push(userId);
    }

    if (branchFilter) {
      filterConditions.push("u.branch_id = ?");
      filterParams.push(branchFilter);
      prevFilterParams.push(branchFilter);
    }

    if (positionFilter) {
      filterConditions.push("u.position_id = ?");
      filterParams.push(positionFilter);
      prevFilterParams.push(positionFilter);
    }

    const whereClause = filterConditions.length > 0 ? "AND " + filterConditions.join(" AND ") : "";

    // РђРєС‚РёРІРЅС‹Рµ Р°С‚С‚РµСЃС‚Р°С†РёРё (С‚РµРєСѓС‰РёР№ РїРµСЂРёРѕРґ)
    const [activeAssessments] = await pool.query(
      `SELECT COUNT(*) as count FROM assessments 
       WHERE open_at <= ? AND close_at >= ?`,
      [dateTo, dateFrom]
    );

    // РђРєС‚РёРІРЅС‹Рµ Р°С‚С‚РµСЃС‚Р°С†РёРё (РїСЂРµРґС‹РґСѓС‰РёР№ РїРµСЂРёРѕРґ)
    const [prevActiveAssessments] = await pool.query(
      `SELECT COUNT(*) as count FROM assessments 
       WHERE open_at <= ? AND close_at >= ?`,
      [prevDateTo, prevDateFrom]
    );

    // Р’СЃРµРіРѕ СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ
    const [totalUsers] = await pool.query(`SELECT COUNT(*) as count FROM users`, filterParams);

    const [prevTotalUsers] = await pool.query(`SELECT COUNT(*) as count FROM users`, [prevDateTo, ...prevFilterParams]);

    // Р¤РёР»РёР°Р»С‹ Рё РґРѕР»Р¶РЅРѕСЃС‚Рё
    const [totalBranches] = await pool.query("SELECT COUNT(*) as count FROM branches");
    const [totalPositions] = await pool.query("SELECT COUNT(*) as count FROM positions");

    // РўРѕРї-3 СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ РїРѕ РѕС‡РєР°Рј (СЃ СѓС‡РµС‚РѕРј С„РёР»СЊС‚СЂРѕРІ)
    const [topUsers] = await pool.query(
      `
      SELECT u.id, u.first_name, u.last_name, u.points, u.level,
             b.name as branch_name, p.name as position_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.role_id IN (SELECT id FROM roles WHERE name = 'employee')
      ${whereClause}
      ORDER BY u.points DESC
      LIMIT 3
    `,
      filterParams
    );

    // РЎСЂРµРґРЅРёР№ РїСЂРѕС†РµРЅС‚ СѓСЃРїРµС€РЅРѕСЃС‚Рё РїРѕ С„РёР»РёР°Р»Р°Рј
    const [avgSuccessRate] = await pool.query(
      `
      SELECT 
        AVG(aa.score_percent) as avg_success_rate,
        COUNT(DISTINCT aa.assessment_id) as total_assessments
      FROM assessment_attempts aa
      JOIN users u ON aa.user_id = u.id
      WHERE aa.status = 'completed'
      AND aa.completed_at BETWEEN ? AND ?
      ${whereClause}
    `,
      [dateFrom, dateTo, ...filterParams]
    );

    // РЎС‚Р°С‚РёСЃС‚РёРєР° РїРѕ Р°С‚С‚РµСЃС‚Р°С†РёСЏРј (С‚РµРєСѓС‰РёР№ РїРµСЂРёРѕРґ)
    const [assessmentStats] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT aa.id) as total_attempts,
        SUM(CASE WHEN aa.status = 'completed' THEN 1 ELSE 0 END) as completed_attempts,
        AVG(CASE WHEN aa.status = 'completed' THEN aa.score_percent ELSE NULL END) as avg_score,
        COUNT(DISTINCT aa.user_id) as unique_users
      FROM assessment_attempts aa
      JOIN users u ON aa.user_id = u.id
      WHERE aa.started_at BETWEEN ? AND ?
      ${whereClause}
    `,
      [dateFrom, dateTo, ...filterParams]
    );

    // РЎС‚Р°С‚РёСЃС‚РёРєР° РїРѕ Р°С‚С‚РµСЃС‚Р°С†РёСЏРј (РїСЂРµРґС‹РґСѓС‰РёР№ РїРµСЂРёРѕРґ)
    const [prevAssessmentStats] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT aa.id) as total_attempts,
        SUM(CASE WHEN aa.status = 'completed' THEN 1 ELSE 0 END) as completed_attempts,
        AVG(CASE WHEN aa.status = 'completed' THEN aa.score_percent ELSE NULL END) as avg_score
      FROM assessment_attempts aa
      JOIN users u ON aa.user_id = u.id
      WHERE aa.started_at BETWEEN ? AND ?
      ${whereClause}
    `,
      [prevDateFrom, prevDateTo, ...prevFilterParams]
    );

    // Р’С‹С‡РёСЃР»СЏРµРј С‚СЂРµРЅРґС‹
    const calcTrend = (current, previous) => {
      if (!previous || previous === 0) return { change: 0, percent: 0 };
      const change = current - previous;
      const percent = ((change / previous) * 100).toFixed(1);
      return { change, percent: parseFloat(percent) };
    };

    res.json({
      activeAssessments: activeAssessments[0].count,
      activeAssessmentsTrend: calcTrend(activeAssessments[0].count, prevActiveAssessments[0].count),

      totalUsers: totalUsers[0].count,
      totalUsersTrend: calcTrend(totalUsers[0].count, prevTotalUsers[0].count),

      totalBranches: totalBranches[0].count,
      totalPositions: totalPositions[0].count,

      avgSuccessRate: avgSuccessRate[0].avg_success_rate || 0,

      topUsers,

      assessmentStats: {
        total_attempts: assessmentStats[0]?.total_attempts || 0,
        completed_attempts: assessmentStats[0]?.completed_attempts || 0,
        avg_score: assessmentStats[0]?.avg_score || 0,
        unique_users: assessmentStats[0]?.unique_users || 0,
        trends: {
          attempts: calcTrend(assessmentStats[0]?.total_attempts || 0, prevAssessmentStats[0]?.total_attempts || 0),
          completed: calcTrend(assessmentStats[0]?.completed_attempts || 0, prevAssessmentStats[0]?.completed_attempts || 0),
          avgScore: calcTrend(assessmentStats[0]?.avg_score || 0, prevAssessmentStats[0]?.avg_score || 0),
        },
      },

      period: {
        from: dateFrom,
        to: dateTo,
        type: period,
      },
    });
  } catch (error) {
    console.error("Get metrics error:", error);
    res.status(500).json({ error: "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ РјРµС‚СЂРёРє" });
  }
};

/**
 * РџРѕР»СѓС‡РёС‚СЊ РґРёРЅР°РјРёРєСѓ Р°РєС‚РёРІРЅРѕСЃС‚Рё (РіСЂР°С„РёРєРё)
 */
exports.getActivityTrends = async (req, res) => {
  try {
    const { period = "week", date_from, date_to, branch_id, position_id } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const branchFilter = branch_id ? Number(branch_id) : null;
    const positionFilter = position_id ? Number(position_id) : null;

    // РћРїСЂРµРґРµР»СЏРµРј РґРёР°РїР°Р·РѕРЅ РґР°С‚
    let dateFrom, dateTo;
    const now = new Date();

    if (period === "week") {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "month") {
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "quarter") {
      dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "custom" && date_from && date_to) {
      dateFrom = new Date(date_from);
      dateTo = new Date(date_to);
    } else {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateTo = now;
    }

    let filterConditions = [];
    let filterParams = [dateFrom, dateTo];

    if (userRole === "manager") {
      filterConditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
      filterParams.push(userId);
    }

    if (branchFilter) {
      filterConditions.push("u.branch_id = ?");
      filterParams.push(branchFilter);
    }

    if (positionFilter) {
      filterConditions.push("u.position_id = ?");
      filterParams.push(positionFilter);
    }

    const whereClause = filterConditions.length > 0 ? "AND " + filterConditions.join(" AND ") : "";

    // Р”РёРЅР°РјРёРєР° РїРѕ РґРЅСЏРј
    const [dailyActivity] = await pool.query(
      `
      SELECT 
        DATE(aa.started_at) as date,
        COUNT(DISTINCT CASE WHEN aa.status = 'in_progress' OR aa.status = 'completed' THEN aa.id END) as started_count,
        COUNT(DISTINCT CASE WHEN aa.status = 'completed' THEN aa.id END) as completed_count,
        COUNT(DISTINCT aa.id) as total_attempts
      FROM assessment_attempts aa
      JOIN users u ON aa.user_id = u.id
      WHERE aa.started_at BETWEEN ? AND ?
      ${whereClause}
      GROUP BY DATE(aa.started_at)
      ORDER BY DATE(aa.started_at)
    `,
      filterParams
    );

    res.json({
      dailyActivity,
      period: { from: dateFrom, to: dateTo, type: period },
    });
  } catch (error) {
    console.error("Get activity trends error:", error);
    res.status(500).json({ error: "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ РґРёРЅР°РјРёРєРё Р°РєС‚РёРІРЅРѕСЃС‚Рё" });
  }
};

/**
 * РџРѕР»СѓС‡РёС‚СЊ KPI РїРѕ С„РёР»РёР°Р»Р°Рј
 */
exports.getBranchKPI = async (req, res) => {
  try {
    const { period = "week", date_from, date_to, branch_id, position_id } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const branchFilter = branch_id ? Number(branch_id) : null;
    const positionFilter = position_id ? Number(position_id) : null;

    // РћРїСЂРµРґРµР»СЏРµРј РґРёР°РїР°Р·РѕРЅ РґР°С‚
    let dateFrom, dateTo;
    const now = new Date();

    if (period === "week") {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "month") {
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "quarter") {
      dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "custom" && date_from && date_to) {
      dateFrom = new Date(date_from);
      dateTo = new Date(date_to);
    } else {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateTo = now;
    }

    const whereConditions = [];
    const whereParams = [];

    if (userRole === "manager") {
      whereConditions.push("b.id = (SELECT branch_id FROM users WHERE id = ?)");
      whereParams.push(userId);
    }

    if (branchFilter) {
      whereConditions.push("b.id = ?");
      whereParams.push(branchFilter);
    }

    if (positionFilter) {
      whereConditions.push("u.position_id = ?");
      whereParams.push(positionFilter);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // KPI РїРѕ С„РёР»РёР°Р»Р°Рј
    const [branchKPI] = await pool.query(
      `
      SELECT 
        b.id,
        b.name as branch_name,
        b.city,
        COUNT(DISTINCT aa.id) as total_attempts,
        SUM(CASE WHEN aa.status = 'completed' THEN 1 ELSE 0 END) as completed_attempts,
        AVG(CASE WHEN aa.status = 'completed' THEN aa.score_percent ELSE NULL END) as success_rate,
        COUNT(DISTINCT CASE WHEN aa.score_percent >= 90 THEN aa.id END) as excellent_count,
        COUNT(DISTINCT CASE WHEN aa.score_percent >= 70 AND aa.score_percent < 90 THEN aa.id END) as good_count,
        COUNT(DISTINCT CASE WHEN aa.score_percent < 70 THEN aa.id END) as poor_count,
        COUNT(DISTINCT aa.user_id) as active_users
      FROM branches b
      LEFT JOIN users u ON b.id = u.branch_id
      LEFT JOIN assessment_attempts aa ON u.id = aa.user_id 
        AND aa.completed_at BETWEEN ? AND ?
      ${whereClause}
      GROUP BY b.id, b.name, b.city
      ORDER BY success_rate DESC
    `,
      [dateFrom, dateTo, ...whereParams]
    );

    // Р”РѕР±Р°РІР»СЏРµРј sparkline РґР°РЅРЅС‹Рµ РґР»СЏ РєР°Р¶РґРѕРіРѕ С„РёР»РёР°Р»Р° (РїРѕСЃР»РµРґРЅРёРµ 7 РґРЅРµР№)
    for (let branch of branchKPI) {
      const sparklineConditions = ["u.branch_id = ?"];
      const sparklineParams = [branch.id];

      if (positionFilter) {
        sparklineConditions.push("u.position_id = ?");
        sparklineParams.push(positionFilter);
      }

      const [sparklineData] = await pool.query(
        `
        SELECT 
          DATE(aa.completed_at) as date,
          AVG(aa.score_percent) as avg_score
        FROM assessment_attempts aa
        JOIN users u ON aa.user_id = u.id
        WHERE ${sparklineConditions.join(" AND ")}
        AND aa.status = 'completed'
        AND aa.completed_at BETWEEN DATE_SUB(?, INTERVAL 7 DAY) AND ?
        GROUP BY DATE(aa.completed_at)
        ORDER BY DATE(aa.completed_at)
      `,
        [...sparklineParams, dateTo, dateTo]
      );

      branch.sparkline = sparklineData.map((d) => d.avg_score || 0);
    }

    res.json({
      branchKPI,
      period: { from: dateFrom, to: dateTo, type: period },
    });
  } catch (error) {
    console.error("Get branch KPI error:", error);
    res.status(500).json({ error: "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ KPI С„РёР»РёР°Р»РѕРІ" });
  }
};

/**
 * РџРѕР»СѓС‡РёС‚СЊ РїРѕСЃР»РµРґРЅРёРµ РїРѕРїС‹С‚РєРё Р°С‚С‚РµСЃС‚Р°С†РёР№
 */
exports.getLatestAssessmentActivities = async (req, res) => {
  try {
    const { limit = 5, period = "week", date_from, date_to, branch_id, position_id } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const branchFilter = branch_id ? Number(branch_id) : null;
    const positionFilter = position_id ? Number(position_id) : null;

    let dateFrom, dateTo;
    const now = new Date();

    if (period === "week") {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "month") {
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "quarter") {
      dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      dateTo = now;
    } else if (period === "custom" && date_from && date_to) {
      dateFrom = new Date(date_from);
      dateTo = new Date(date_to);
    } else {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateTo = now;
    }

    const conditions = ["aa.created_at BETWEEN ? AND ?"];
    const params = [dateFrom, dateTo];

    if (userRole === "manager") {
      conditions.push("u.branch_id = (SELECT branch_id FROM users WHERE id = ?)");
      params.push(userId);
    }

    if (branchFilter) {
      conditions.push("u.branch_id = ?");
      params.push(branchFilter);
    }

    if (positionFilter) {
      conditions.push("u.position_id = ?");
      params.push(positionFilter);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [latestActivities] = await pool.query(
      `
      SELECT 
        aa.id,
        u.first_name,
        u.last_name,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        a.title as assessment_name,
        CASE 
          WHEN aa.status = 'in_progress' THEN 'РЅР°С‡Р°Р»'
          WHEN aa.status = 'completed' THEN 'Р·Р°РІРµСЂС€РёР»'
          ELSE 'РїСЂРѕСЃРјР°С‚СЂРёРІР°РµС‚'
        END as activity_type,
        aa.created_at,
        aa.updated_at,
        aa.status,
        aa.score_percent
      FROM assessment_attempts aa
      JOIN users u ON aa.user_id = u.id
      JOIN assessments a ON aa.assessment_id = a.id
      ${whereClause}
      ORDER BY aa.created_at DESC
      LIMIT ?
    `,
      [...params, parseInt(limit)]
    );

    res.json({ latestActivities });
  } catch (error) {
    console.error("Get latest assessment activities error:", error);
    res.status(500).json({ error: "РћС€РёР±РєР° РїРѕР»СѓС‡РµРЅРёСЏ РїРѕСЃР»РµРґРЅРёС… РґРµР№СЃС‚РІРёР№ Р°С‚С‚РµСЃС‚Р°С†РёР№" });
  }
};

