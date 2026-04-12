const Joi = require("joi");
const bcrypt = require("bcrypt");
const userModel = require("../../../models/userModel");
const { pool } = require("../../../config/database");
const assessmentModel = require("../../../models/assessmentModel");
const referenceModel = require("../../../models/referenceModel");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");

const updateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  branchId: Joi.number().integer().positive().required(),
  positionId: Joi.number().integer().positive().required(),
  roleId: Joi.number().integer().positive().required(),
  login: Joi.string().trim().min(3).max(50).optional().allow(""),
  level: Joi.number().integer().min(1).default(1),
  points: Joi.number().integer().min(0).default(0),
});

async function listUsers(req, res, next) {
  try {
    const { branch, position, role, level, search } = req.query;
    const currentUser = req.user; // { id, role }

    let query = `
      SELECT 
        u.id, 
        u.telegram_id, 
        u.first_name, 
        u.last_name, 
        u.login,
        u.level, 
        u.points, 
        u.created_at,
        b.name as branch_name,
        b.id as branch_id,
        p.name as position_name,
        p.id as position_id,
        r.name as role_name,
        r.id as role_id
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;

    const params = [];

    // Manager РІРёРґРёС‚ РІСЃРµС… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
    // РќРµ РґРѕР±Р°РІР»СЏРµРј С„РёР»СЊС‚СЂР°С†РёСЋ РїРѕ СЂРѕР»Рё РґР»СЏ manager

    if (branch) {
      query += " AND u.branch_id = ?";
      params.push(branch);
    }

    if (position) {
      query += " AND u.position_id = ?";
      params.push(position);
    }

    if (role) {
      query += " AND u.role_id = ?";
      params.push(role);
    }

    if (level) {
      query += " AND u.level = ?";
      params.push(level);
    }

    if (search) {
      query += " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.login LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += " ORDER BY u.id ASC";

    const [users] = await pool.query(query, params);
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const currentUser = req.user;
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const existing = await userModel.findById(userId);
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    // РћРіСЂР°РЅРёС‡РµРЅРёСЏ РґР»СЏ manager
    if (currentUser.role === "manager") {
      const isEditingSelf = userId === currentUser.id;

      if (!isEditingSelf) {
        // Manager РјРѕР¶РµС‚ СЂРµРґР°РєС‚РёСЂРѕРІР°С‚СЊ С‚РѕР»СЊРєРѕ employee
        if (existing.roleId !== 1) {
          // 1 = employee
          return res.status(403).json({ error: "Р’С‹ РјРѕР¶РµС‚Рµ СЂРµРґР°РєС‚РёСЂРѕРІР°С‚СЊ С‚РѕР»СЊРєРѕ СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ СЃ СЂРѕР»СЊСЋ employee" });
        }

        // Manager РЅРµ РјРѕР¶РµС‚ РјРµРЅСЏС‚СЊ СЂРѕР»СЊ Сѓ employee
        if (value.roleId && value.roleId !== existing.roleId) {
          return res.status(403).json({ error: "Р’С‹ РЅРµ РјРѕР¶РµС‚Рµ РёР·РјРµРЅСЏС‚СЊ СЂРѕР»СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ" });
        }

        // Manager РЅРµ РјРѕР¶РµС‚ РјРµРЅСЏС‚СЊ Р»РѕРіРёРЅ Сѓ employee
        if (value.login !== undefined && value.login !== existing.login) {
          return res.status(403).json({ error: "Р’С‹ РЅРµ РјРѕР¶РµС‚Рµ РёР·РјРµРЅСЏС‚СЊ Р»РѕРіРёРЅ СЃРѕС‚СЂСѓРґРЅРёРєР°" });
        }

        // РЈСЃС‚Р°РЅР°РІР»РёРІР°РµРј Р·РЅР°С‡РµРЅРёСЏ РёР· existing РґР»СЏ РїРѕР»РµР№, РєРѕС‚РѕСЂС‹Рµ manager РЅРµ РјРѕР¶РµС‚ РјРµРЅСЏС‚СЊ Сѓ employee
        value.roleId = existing.roleId;
        value.login = existing.login;
      } else {
        // РџСЂРё СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёРё СЃРµР±СЏ:
        // Manager РЅРµ РјРѕР¶РµС‚ РјРµРЅСЏС‚СЊ СЃРІРѕСЋ СЂРѕР»СЊ
        if (value.roleId && value.roleId !== existing.roleId) {
          return res.status(403).json({ error: "Р’С‹ РЅРµ РјРѕР¶РµС‚Рµ РёР·РјРµРЅСЏС‚СЊ СЃРІРѕСЋ СЂРѕР»СЊ" });
        }
        value.roleId = existing.roleId;
        // Manager РјРѕР¶РµС‚ РјРµРЅСЏС‚СЊ СЃРІРѕР№ С„РёР»РёР°Р» Рё РґСЂСѓРіРёРµ РїРѕР»СЏ
      }
    }

    const branch = await referenceModel.getBranchById(value.branchId);
    if (!branch) {
      return res.status(422).json({ error: "Branch does not exist" });
    }

    const position = await referenceModel.getPositionById(value.positionId);
    if (!position) {
      return res.status(422).json({ error: "Position does not exist" });
    }

    const role = await referenceModel.getRoleById(value.roleId);
    if (!role) {
      return res.status(422).json({ error: "Role does not exist" });
    }

    // РџСЂРѕРІРµСЂРєР° СѓРЅРёРєР°Р»СЊРЅРѕСЃС‚Рё Р»РѕРіРёРЅР°, РµСЃР»Рё РѕРЅ Р±С‹Р» РїРµСЂРµРґР°РЅ
    if (value.login && value.login.trim() !== "") {
      const [loginExists] = await pool.query("SELECT id FROM users WHERE login = ? AND id != ?", [value.login.trim(), userId]);
      if (loginExists.length > 0) {
        return res.status(422).json({ error: "Р›РѕРіРёРЅ СѓР¶Рµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РґСЂСѓРіРёРј РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј" });
      }
    }

    const payload = {
      firstName: value.firstName,
      lastName: value.lastName,
      positionId: value.positionId,
      branchId: value.branchId,
      roleId: value.roleId,
      level: value.level ?? existing.level,
      points: value.points ?? existing.points,
    };

    // Р”РѕР±Р°РІР»СЏРµРј Р»РѕРіРёРЅ РІ payload, РµСЃР»Рё РѕРЅ Р±С‹Р» РїРµСЂРµРґР°РЅ
    if (value.login !== undefined) {
      payload.login = value.login.trim() || null;
    }

    await userModel.updateUserByAdmin(userId, payload);
    await assessmentModel.assignUserToMatchingAssessments({
      userId,
      branchId: value.branchId,
      positionId: value.positionId,
    });
    const updated = await userModel.findById(userId);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "user.updated",
      entity: "user",
      entityId: userId,
      metadata: {
        branchId: value.branchId,
        positionId: value.positionId,
        roleId: value.roleId,
        level: value.level ?? existing.level,
        points: value.points ?? existing.points,
      },
    });

    res.json({ user: updated });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const currentUser = req.user;

    // Manager РЅРµ РјРѕР¶РµС‚ СѓРґР°Р»СЏС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
    if (currentUser.role === "manager") {
      return res.status(403).json({ error: "РЈ РІР°СЃ РЅРµС‚ РїСЂР°РІ РЅР° СѓРґР°Р»РµРЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№" });
    }

    const existing = await userModel.findById(userId);
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: "РќРµР»СЊР·СЏ СѓРґР°Р»РёС‚СЊ СЃР°РјРѕРіРѕ СЃРµР±СЏ" });
    }

    await userModel.deleteUser(userId);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "user.deleted",
      entity: "user",
      entityId: userId,
      metadata: {
        firstName: existing.firstName,
        lastName: existing.lastName,
      },
      result: "success",
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * РџРѕР»СѓС‡РёС‚СЊ РґРµС‚Р°Р»СЊРЅСѓСЋ СЃС‚Р°С‚РёСЃС‚РёРєСѓ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
 */
async function getUserDetailedStats(req, res, next) {
  try {
    const userId = Number(req.params.id);

    // РћСЃРЅРѕРІРЅР°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ
    const [users] = await pool.query(
      `SELECT 
        u.id, u.telegram_id, u.first_name, u.last_name,
        u.level, u.points, u.created_at,
        b.name as branch_name, p.name as position_name, r.name as role_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?`,
      [userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ error: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    // РЎС‚Р°С‚РёСЃС‚РёРєР° Р°С‚С‚РµСЃС‚Р°С†РёР№
    const [assessmentStats] = await pool.query(
      `SELECT 
        COUNT(DISTINCT aa.assessment_id) as total_assessments,
        COUNT(
          DISTINCT CASE 
            WHEN aa.status = 'completed' AND aa.score_percent >= a.pass_score_percent THEN aa.id 
          END
        ) as completed_attempts,
        AVG(CASE WHEN aa.status = 'completed' THEN aa.score_percent END) as avg_score,
        SUM(CASE WHEN aa.score_percent >= 90 THEN 1 ELSE 0 END) as excellent_count,
        SUM(CASE WHEN aa.score_percent >= 70 AND aa.score_percent < 90 THEN 1 ELSE 0 END) as good_count,
        MIN(aa.started_at) as first_attempt_date,
        MAX(aa.completed_at) as last_attempt_date
      FROM assessment_attempts aa
      JOIN assessments a ON a.id = aa.assessment_id
      WHERE aa.user_id = ?`,
      [userId]
    );

    // РЎРІРѕРґРєР° РїРѕ Р°С‚С‚РµСЃС‚Р°С†РёСЏРј
    const [assessmentSummary] = await pool.query(
      `SELECT 
        a.id,
        a.title,
        a.pass_score_percent,
        MAX(aa.score_percent) as best_score_percent,
        COUNT(*) as attempts_count,
        SUM(aa.time_spent_seconds) as time_spent_seconds,
        MAX(COALESCE(aa.completed_at, aa.started_at)) as last_attempt_at
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE aa.user_id = ?
      GROUP BY a.id, a.title, a.pass_score_percent
      ORDER BY last_attempt_at DESC`,
      [userId]
    );

    // Р‘РµР№РґР¶Рё
    const [badges] = await pool.query(
      `SELECT 
        b.id, b.code, b.name, b.description, b.icon,
        ub.awarded_at as earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.awarded_at DESC`,
      [userId]
    );

    // Р РµР№С‚РёРЅРі
    const [rankData] = await pool.query(
      `SELECT 
        (SELECT COUNT(*) + 1 FROM users WHERE points > ?) as user_rank,
        (SELECT COUNT(*) FROM users WHERE role_id IN (SELECT id FROM roles WHERE name = 'employee')) as total_users
      FROM DUAL`,
      [users[0].points]
    );

    // РџСЂРѕРіСЂРµСЃСЃ РґРѕ СЃР»РµРґСѓСЋС‰РµРіРѕ СѓСЂРѕРІРЅСЏ
    const [levels] = await pool.query(
      `SELECT level_number, min_points 
       FROM gamification_levels 
       WHERE level_number > ? 
       ORDER BY level_number ASC 
       LIMIT 1`,
      [users[0].level]
    );

    const nextLevel = levels[0] || null;
    const progressToNextLevel = nextLevel
      ? ((users[0].points - users[0].level * 100) / (nextLevel.min_points - users[0].level * 100 || 1)) * 100
      : 100;

    res.json({
      user: users[0],
      stats: assessmentStats[0] || {},
      assessmentsSummary: assessmentSummary,
      badges,
      rank: rankData[0] || { user_rank: 0, total_users: 0 },
      nextLevel,
      progressToNextLevel: Math.min(100, Math.max(0, progressToNextLevel)),
    });
  } catch (error) {
    console.error("Get user detailed stats error:", error);
    next(error);
  }
}

/**
 * Р­РєСЃРїРѕСЂС‚ СЃРїРёСЃРєР° РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РІ Excel
 */
async function exportUsersToExcel(req, res, next) {
  try {
    const { branch, position, role, level, search } = req.query;
    const ExcelJS = require("exceljs");

    // РџРѕР»СѓС‡Р°РµРј РґР°РЅРЅС‹Рµ СЃ СѓС‡РµС‚РѕРј С„РёР»СЊС‚СЂРѕРІ
    let query = `
      SELECT 
        u.id, 
        u.telegram_id, 
        u.first_name, 
        u.last_name, 
        u.login,
        u.level, 
        u.points, 
        u.created_at,
        b.name as branch_name,
        p.name as position_name,
        r.name as role_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;

    const params = [];

    if (branch) {
      query += " AND u.branch_id = ?";
      params.push(branch);
    }

    if (position) {
      query += " AND u.position_id = ?";
      params.push(position);
    }

    if (role) {
      query += " AND u.role_id = ?";
      params.push(role);
    }

    if (level) {
      query += " AND u.level = ?";
      params.push(level);
    }

    if (search) {
      query += " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.login LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += " ORDER BY u.created_at DESC";

    const [users] = await pool.query(query, params);

    // РЎРѕР·РґР°РµРј workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("РџРѕР»СЊР·РѕРІР°С‚РµР»Рё");

    // Р—Р°РіРѕР»РѕРІРєРё
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "РРјСЏ", key: "first_name", width: 20 },
      { header: "Р¤Р°РјРёР»РёСЏ", key: "last_name", width: 20 },
      { header: "Р›РѕРіРёРЅ", key: "login", width: 20 },
      { header: "Telegram ID", key: "telegram_id", width: 15 },
      { header: "Р¤РёР»РёР°Р»", key: "branch_name", width: 25 },
      { header: "Р”РѕР»Р¶РЅРѕСЃС‚СЊ", key: "position_name", width: 25 },
      { header: "Р РѕР»СЊ", key: "role_name", width: 15 },
      { header: "РЈСЂРѕРІРµРЅСЊ", key: "level", width: 10 },
      { header: "РћС‡РєРё", key: "points", width: 10 },
      { header: "Р”Р°С‚Р° СЃРѕР·РґР°РЅРёСЏ", key: "created_at", width: 20 },
    ];

    // РЎС‚РёР»РёР·Р°С†РёСЏ Р·Р°РіРѕР»РѕРІРєРѕРІ
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Р”РѕР±Р°РІР»СЏРµРј РґР°РЅРЅС‹Рµ
    users.forEach((user) => {
      worksheet.addRow({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        login: user.login || "вЂ”",
        telegram_id: user.telegram_id || "вЂ”",
        branch_name: user.branch_name || "вЂ”",
        position_name: user.position_name || "вЂ”",
        role_name: user.role_name || "вЂ”",
        level: user.level || 1,
        points: user.points || 0,
        created_at: user.created_at ? new Date(user.created_at).toLocaleDateString("ru-RU") : "вЂ”",
      });
    });

    // РћС‚РїСЂР°РІРєР° С„Р°Р№Р»Р°
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=users_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export users to Excel error:", error);
    next(error);
  }
}

module.exports = {
  listUsers,
  updateUser,
  deleteUser,
  createUser,
  resetPassword,
  getUserById,
  getUserDetailedStats,
  exportUsersToExcel,
  resetAssessmentProgress,
};

/**
 * РЎР±СЂРѕСЃРёС‚СЊ РїСЂРѕРіСЂРµСЃСЃ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РїРѕ Р°С‚С‚РµСЃС‚Р°С†РёРё
 */
async function resetAssessmentProgress(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const userId = parseInt(req.params.userId, 10);
    const assessmentId = parseInt(req.params.assessmentId, 10);

    if (isNaN(userId) || isNaN(assessmentId)) {
      return res.status(400).json({ error: "РќРµРІРµСЂРЅС‹Рµ РїР°СЂР°РјРµС‚СЂС‹" });
    }

    // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
    const [users] = await connection.query("SELECT id, first_name, last_name FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    // РџСЂРѕРІРµСЂСЏРµРј СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ Р°С‚С‚РµСЃС‚Р°С†РёРё
    const [assessments] = await connection.query("SELECT id, title FROM assessments WHERE id = ?", [assessmentId]);
    if (assessments.length === 0) {
      return res.status(404).json({ error: "РђС‚С‚РµСЃС‚Р°С†РёСЏ РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    await connection.beginTransaction();

    // РџРѕР»СѓС‡Р°РµРј РёРЅС„РѕСЂРјР°С†РёСЋ Рѕ РїРѕРїС‹С‚РєР°С… РїРµСЂРµРґ СѓРґР°Р»РµРЅРёРµРј РґР»СЏ Р»РѕРіРёСЂРѕРІР°РЅРёСЏ
    const [attempts] = await connection.query(
      `SELECT id, attempt_number, status, score_percent 
       FROM assessment_attempts 
       WHERE user_id = ? AND assessment_id = ?`,
      [userId, assessmentId]
    );

    // РЈРґР°Р»СЏРµРј РѕС‚РІРµС‚С‹ РЅР° РІРѕРїСЂРѕСЃС‹
    await connection.query(
      `DELETE aa FROM assessment_answers aa
       INNER JOIN assessment_attempts at ON aa.attempt_id = at.id
       WHERE at.user_id = ? AND at.assessment_id = ?`,
      [userId, assessmentId]
    );

    // РЈРґР°Р»СЏРµРј РїРѕРїС‹С‚РєРё
    await connection.query("DELETE FROM assessment_attempts WHERE user_id = ? AND assessment_id = ?", [userId, assessmentId]);

    // РЈРґР°Р»СЏРµРј Р·Р°РІРµСЂС€РµРЅРёРµ С‚РµРѕСЂРёРё
    await connection.query("DELETE FROM assessment_theory_completions WHERE user_id = ? AND assessment_id = ?", [userId, assessmentId]);

    await connection.commit();

    // Р›РѕРіРёСЂСѓРµРј РґРµР№СЃС‚РІРёРµ
    await logAndSend({
      action: "reset_assessment_progress",
      entityType: "assessment_attempt",
      entityId: assessmentId,
      changes: {
        userId,
        assessmentId,
        deletedAttempts: attempts.length,
        attempts: attempts.map((a) => ({
          attemptNumber: a.attempt_number,
          status: a.status,
          scorePercent: a.score_percent,
        })),
      },
      metadata: {
        userName: `${users[0].first_name} ${users[0].last_name}`,
        assessmentTitle: assessments[0].title,
        resetBy: req.user.id,
      },
    });

    res.json({
      message: "РџСЂРѕРіСЂРµСЃСЃ Р°С‚С‚РµСЃС‚Р°С†РёРё СѓСЃРїРµС€РЅРѕ СЃР±СЂРѕС€РµРЅ",
      deletedAttempts: attempts.length,
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

/**
 * РЎРѕР·РґР°С‚СЊ РЅРѕРІРѕРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ (С‚РѕР»СЊРєРѕ РґР»СЏ СЃСѓРїРµСЂР°РґРјРёРЅР°)
 */
async function createUser(req, res, next) {
  try {
    const currentUser = req.user;

    // РўРѕР»СЊРєРѕ superadmin РјРѕР¶РµС‚ СЃРѕР·РґР°РІР°С‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
    if (currentUser.role !== "superadmin") {
      return res.status(403).json({ error: "РЈ РІР°СЃ РЅРµС‚ РїСЂР°РІ РЅР° СЃРѕР·РґР°РЅРёРµ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№" });
    }

    const { firstName, lastName, branchId, positionId, roleId, login, password } = req.body;

    // Р’Р°Р»РёРґР°С†РёСЏ
    if (!firstName || !lastName || !branchId || !positionId || !roleId) {
      return res.status(400).json({ error: "Р’СЃРµ РїРѕР»СЏ РѕР±СЏР·Р°С‚РµР»СЊРЅС‹" });
    }

    // РџСЂРѕРІРµСЂРєР° СѓРЅРёРєР°Р»СЊРЅРѕСЃС‚Рё Р»РѕРіРёРЅР°
    if (login) {
      const [existing] = await pool.query("SELECT id FROM users WHERE login = ?", [login]);
      if (existing.length > 0) {
        return res.status(400).json({ error: "Р›РѕРіРёРЅ СѓР¶Рµ Р·Р°РЅСЏС‚" });
      }
    }

    // РҐРµС€РёСЂСѓРµРј РїР°СЂРѕР»СЊ, РµСЃР»Рё СѓРєР°Р·Р°РЅ
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Р“РµРЅРµСЂРёСЂСѓРµРј СѓРЅРёРєР°Р»СЊРЅС‹Р№ telegram_id РґР»СЏ СЂСѓС‡РЅРѕРіРѕ СЃРѕР·РґР°РЅРёСЏ
    const telegramId = "manual_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    const [result] = await pool.query(
      `
      INSERT INTO users (
        telegram_id, first_name, last_name, position_id, branch_id, role_id, login, password, level, points
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [telegramId, firstName, lastName, positionId, branchId, roleId, login, hashedPassword, 1, 0]
    );

    const [newUser] = await pool.query(
      `
      SELECT 
        u.id, u.first_name, u.last_name, u.login, u.level, u.points,
        b.name as branch_name, p.name as position_name, r.name as role_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `,
      [result.insertId]
    );

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "user.created",
      entity: "user",
      entityId: newUser[0].id,
      metadata: {
        branchId,
        positionId,
        roleId,
        login: login || null,
      },
    });

    await assessmentModel.assignUserToMatchingAssessments({
      userId: newUser[0].id,
      branchId,
      positionId,
    });

    res.status(201).json({ user: newUser[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * РЎР±СЂРѕСЃРёС‚СЊ РїР°СЂРѕР»СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
 */
async function resetPassword(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const currentUser = req.user;

    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "РџР°СЂРѕР»СЊ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РЅРµ РјРµРЅРµРµ 6 СЃРёРјРІРѕР»РѕРІ" });
    }

    const [users] = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    const targetUser = users[0];

    // Manager РјРѕР¶РµС‚ СЃР±СЂР°СЃС‹РІР°С‚СЊ РїР°СЂРѕР»Рё С‚РѕР»СЊРєРѕ employee (Рё СЃРµР±Рµ)
    if (currentUser.role === "manager") {
      if (targetUser.id !== currentUser.id && targetUser.role_name !== "employee") {
        return res.status(403).json({
          error: "Р’С‹ РјРѕР¶РµС‚Рµ СЃР±СЂР°СЃС‹РІР°С‚СЊ РїР°СЂРѕР»Рё С‚РѕР»СЊРєРѕ СЃРѕС‚СЂСѓРґРЅРёРєР°Рј СЃ СЂРѕР»СЊСЋ employee",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "user.password.reset",
      entity: "user",
      entityId: userId,
      metadata: {
        changedBy: req.user.id,
      },
    });

    res.json({ message: "РџР°СЂРѕР»СЊ СѓСЃРїРµС€РЅРѕ СЃР±СЂРѕС€РµРЅ" });
  } catch (error) {
    next(error);
  }
}

/**
 * РџРѕР»СѓС‡РёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РїРѕ ID
 */
async function getUserById(req, res, next) {
  try {
    const userId = Number(req.params.id);

    const [users] = await pool.query(
      `
      SELECT 
        u.*, 
        b.name as branch_name,
        p.name as position_name,
        r.name as role_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    // РџРѕР»СѓС‡РёС‚СЊ СЃС‚Р°С‚РёСЃС‚РёРєСѓ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
    const [stats] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT aa.id) as total_attempts,
        COUNT(DISTINCT CASE WHEN aa.status = 'completed' THEN aa.id END) as completed_attempts,
        AVG(aa.score) as avg_score
      FROM assessment_attempts aa
      WHERE aa.user_id = ?
    `,
      [userId]
    );

    const user = {
      ...users[0],
      stats: stats[0],
    };

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

