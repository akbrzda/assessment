const Joi = require("joi");
const bcrypt = require("bcrypt");
const userModel = require("../../../models/userModel");
const { pool } = require("../../../config/database");
const assessmentModel = require("../../../models/assessmentModel");
const referenceModel = require("../../../models/referenceModel");
const invitationModel = require("../../../models/invitationModel");
const { generateInviteCode } = require("../../../utils/tokenGenerator");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");
const { listPublishedCoursesForUser } = require("../../courses/userCourseView.repository");
const permissionService = require("../../../services/PermissionService");
const { normalizePhoneToE164Ru } = require("../../../utils/phone");

const updateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(64).required(),
  lastName: Joi.string().trim().min(2).max(64).required(),
  branchId: Joi.number().integer().positive().required(),
  positionId: Joi.number().integer().positive().required(),
  roleId: Joi.number().integer().positive().required(),
  phone: Joi.string().trim().required(),
  login: Joi.string().trim().min(3).max(50).optional().allow(""),
  level: Joi.number().integer().min(1).default(1),
  points: Joi.number().integer().min(0).default(0),
});

const permissionOverrideSchema = Joi.object({
  permissionId: Joi.number().integer().positive().required(),
  effect: Joi.string().valid("allow", "deny").required(),
  reason: Joi.string().trim().max(255).allow("", null).optional(),
  expiresAt: Joi.date().iso().allow(null).optional(),
});

const addUserRoleSchema = Joi.object({
  roleId: Joi.number().integer().positive().required(),
  expiresAt: Joi.date().iso().allow(null).optional(),
});

function toMySqlDateTime(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function listUsers(req, res, next) {
  try {
    const currentUser = req.user || {};
    const { branch, position, role, level, search } = req.query;
    const rawPage = Number(req.query?.page);
    const rawLimit = Number(req.query?.limit);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.trunc(rawPage) : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.trunc(rawLimit), 100) : 20;
    const offset = (page - 1) * limit;

    const selectClause = `
      SELECT 
        u.id, 
        u.telegram_id, 
        u.first_name, 
        u.last_name, 
        u.login,
        u.phone_e164,
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
    `;

    let whereClause = "WHERE u.deleted_at IS NULL";

    const params = [];

    if (currentUser.role === "manager") {
      const managerBranchId = Number(currentUser.branch_id || currentUser.branchId || 0);
      if (managerBranchId > 0) {
        whereClause += " AND u.branch_id = ?";
        params.push(managerBranchId);
      }
    }

    if (branch) {
      whereClause += " AND u.branch_id = ?";
      params.push(branch);
    }

    if (position) {
      whereClause += " AND u.position_id = ?";
      params.push(position);
    }

    if (role) {
      whereClause += " AND u.role_id = ?";
      params.push(role);
    }

    if (level) {
      whereClause += " AND u.level = ?";
      params.push(level);
    }

    if (search) {
      whereClause += " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.login LIKE ? OR CAST(u.id AS CHAR) LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM users u
       ${whereClause}`,
      params,
    );

    const [users] = await pool.query(
      `${selectClause}
       ${whereClause}
       ORDER BY u.id ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const total = Number(countRow?.total || 0);
    res.setHeader("X-Total-Count", String(total));
    res.json({
      users,
      total,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
}

async function getUserLoginHistory(req, res, next) {
  try {
    const currentUser = req.user || {};
    const rawUserId = Number(req.query?.userId);
    const userId = Number.isInteger(rawUserId) && rawUserId > 0 ? rawUserId : null;
    const search = String(req.query?.search || "").trim();
    const rawPage = Number(req.query?.page);
    const rawLimit = Number(req.query?.limit);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.trunc(rawPage) : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.trunc(rawLimit), 100) : 20;
    const offset = (page - 1) * limit;

    const whereParts = ["1=1"];
    const params = [];

    if (currentUser.role === "manager") {
      const managerBranchId = Number(currentUser.branch_id || currentUser.branchId || 0);
      if (managerBranchId > 0) {
        whereParts.push("u.branch_id = ?");
        params.push(managerBranchId);
      }
    }

    if (userId) {
      whereParts.push("u.id = ?");
      params.push(userId);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      whereParts.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.login LIKE ? OR CAST(u.id AS CHAR) LIKE ?)");
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = `WHERE ${whereParts.join(" AND ")}`;

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM user_login_history ulh
       JOIN users u ON u.id = ulh.user_id
       ${whereClause}`,
      params,
    );

    const [rows] = await pool.query(
      `SELECT
         ulh.id,
         ulh.user_id,
         ulh.status,
         ulh.ip_address,
         ulh.user_agent,
         ulh.created_at,
         u.login,
         u.first_name,
         u.last_name
       FROM user_login_history ulh
       JOIN users u ON u.id = ulh.user_id
       ${whereClause}
       ORDER BY ulh.created_at DESC, ulh.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    res.json({
      events: rows,
      total: Number(countRow?.total || 0),
      page,
      limit,
    });
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

    // Ограничения для manager
    if (currentUser.role === "manager") {
      const isEditingSelf = userId === currentUser.id;

      if (!isEditingSelf) {
        // Manager может редактировать только employee
        if (existing.roleId !== 1) {
          // 1 = employee
          return res.status(403).json({ error: "Вы можете редактировать только сотрудников с ролью employee" });
        }

        // Manager не может менять роль Сѓ employee
        if (value.roleId && value.roleId !== existing.roleId) {
          return res.status(403).json({ error: "Вы не можете изменять роль пользователя" });
        }

        // Manager не может менять логин Сѓ employee
        if (value.login !== undefined && value.login !== existing.login) {
          return res.status(403).json({ error: "Вы не можете изменять логин сотрудника" });
        }

        // Устанавливаем значения из existing для полей, которые manager не может менять Сѓ employee
        value.roleId = existing.roleId;
        value.login = existing.login;
      } else {
        // При редактировании себя:
        // Manager не может менять свою роль
        if (value.roleId && value.roleId !== existing.roleId) {
          return res.status(403).json({ error: "Вы не можете изменять свою роль" });
        }
        value.roleId = existing.roleId;
        // Manager может менять свой филиал и другие поля
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

    // Проверка уникальности логина, если он был передан
    if (value.login && value.login.trim() !== "") {
      const [loginExists] = await pool.query("SELECT id FROM users WHERE login = ? AND id != ?", [value.login.trim(), userId]);
      if (loginExists.length > 0) {
        return res.status(422).json({ error: "Логин уже используется другим пользователем" });
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

    if (!value.phone || !String(value.phone).trim()) {
      return res.status(422).json({ error: "Телефон обязателен" });
    }
    const normalizedPhone = normalizePhoneToE164Ru(value.phone);
    if (!normalizedPhone || !/^\+7\d{10}$/.test(normalizedPhone)) {
      return res.status(422).json({ error: "Телефон должен быть в формате +7XXXXXXXXXX" });
    }
    payload.phoneE164 = normalizedPhone;

    // Добавляем логин в payload, если он был передан
    if (value.login !== undefined) {
      payload.login = value.login.trim() || null;
    }

    await userModel.updateUserByAdmin(userId, payload);
    await pool.query(
      `UPDATE invitations
       SET phone = ?, updated_at = NOW()
       WHERE invited_user_id = ?
         AND used_by IS NULL`,
      [payload.phoneE164, userId],
    );
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
        phoneE164: payload.phoneE164 ?? existing.phoneE164 ?? null,
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

    // Manager не может удалять пользователей
    if (currentUser.role === "manager") {
      return res.status(403).json({ error: "У вас нет прав на удаление пользователей" });
    }

    const existing = await userModel.findById(userId);
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: "Нельзя удалить самого себя" });
    }

    await userModel.softDelete(userId, currentUser.id);

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
 * Получить детальную статистику пользователя
 */
async function getUserDetailedStats(req, res, next) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Некорректный ID пользователя" });
    }

    // Основная информация
    const [users] = await pool.query(
      `SELECT 
        u.id, u.telegram_id, u.first_name, u.last_name, u.login,
        u.level, u.points, u.created_at,
        u.phone_e164, u.phone_verification_status, u.phone_verified_at, u.phone_verification_source,
        b.name as branch_name, p.name as position_name, r.name as role_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
        AND u.deleted_at IS NULL`,
      [userId],
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Статистика аттестаций
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
      [userId],
    );

    // Сводка по аттестациям
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
      [userId],
    );

    // Бейджи
    const [badges] = await pool.query(
      `SELECT 
        b.id, b.code, b.name, b.description, b.icon,
        ub.awarded_at as earned_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.awarded_at DESC`,
      [userId],
    );

    // Рейтинг
    const [rankData] = await pool.query(
      `SELECT 
        (SELECT COUNT(*) + 1 FROM users WHERE points > ? AND deleted_at IS NULL) as user_rank,
        (SELECT COUNT(*) FROM users WHERE role_id IN (SELECT id FROM roles WHERE name = 'employee') AND deleted_at IS NULL) as total_users
      FROM DUAL`,
      [users[0].points],
    );

    const [invitationRows] = await pool.query(
      `SELECT id, code, created_at
       FROM invitations
       WHERE invited_user_id = ?
         AND used_by IS NULL
       ORDER BY id DESC
       LIMIT 1`,
      [userId],
    );

    const [platformIdentities] = await pool.query(
      `SELECT platform, platform_user_id, platform_username, is_verified, verified_at
       FROM user_platform_identities
       WHERE user_id = ?
       ORDER BY platform ASC`,
      [userId],
    );

    let phoneConflict = {
      hasConflict: false,
      conflictingUserIds: [],
      conflictingProfilesCount: 0,
    };
    if (users[0].phone_e164 && users[0].phone_verification_status === "verified") {
      const [phoneConflictRows] = await pool.query(
        `SELECT id
         FROM users
         WHERE deleted_at IS NULL
           AND phone_e164 = ?
           AND phone_verification_status = 'verified'
         ORDER BY id ASC`,
        [users[0].phone_e164],
      );
      const conflictingIds = phoneConflictRows.map((row) => Number(row.id)).filter((id) => id !== userId);
      phoneConflict = {
        hasConflict: conflictingIds.length > 0,
        conflictingUserIds: conflictingIds,
        conflictingProfilesCount: conflictingIds.length,
      };
    }

    // Прогресс до следующего уровня
    const [levels] = await pool.query(
      `SELECT level_number, min_points 
       FROM gamification_levels 
       WHERE level_number > ? 
       ORDER BY level_number ASC 
       LIMIT 1`,
      [users[0].level],
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
      invitation: invitationRows[0] || null,
      identities: platformIdentities,
      identityDiagnostics: {
        phoneE164: users[0].phone_e164 || null,
        phoneVerificationStatus: users[0].phone_verification_status || "unverified",
        phoneConflict,
      },
      nextLevel,
      progressToNextLevel: Math.min(100, Math.max(0, progressToNextLevel)),
    });
  } catch (error) {
    console.error("Get user detailed stats error:", error);
    next(error);
  }
}

async function getUserCourses(req, res, next) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Некорректный ID пользователя" });
    }

    const [users] = await pool.query(
      `SELECT id, position_id, branch_id
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId],
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const user = users[0];
    const courses = await listPublishedCoursesForUser(userId, user.position_id || null, user.branch_id || null);

    return res.json({ courses });
  } catch (error) {
    next(error);
  }
}

/**
 * Экспорт списка пользователей в Excel
 */
async function exportUsersToExcel(req, res, next) {
  try {
    const { branch, position, role, level, search } = req.query;
    const ExcelJS = require("exceljs");

    // Получаем данные с учетом фильтров
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

    // Создаем workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Пользователи");

    // Заголовки
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Имя", key: "first_name", width: 20 },
      { header: "Фамилия", key: "last_name", width: 20 },
      { header: "Логин", key: "login", width: 20 },
      { header: "Telegram ID", key: "telegram_id", width: 15 },
      { header: "Филиал", key: "branch_name", width: 25 },
      { header: "Должность", key: "position_name", width: 25 },
      { header: "Роль", key: "role_name", width: 15 },
      { header: "Уровень", key: "level", width: 10 },
      { header: "Очки", key: "points", width: 10 },
      { header: "Дата создания", key: "created_at", width: 20 },
    ];

    // Стилизация заголовков
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Добавляем данные
    users.forEach((user) => {
      worksheet.addRow({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        login: user.login || "-",
        telegram_id: user.telegram_id || "-",
        branch_name: user.branch_name || "-",
        position_name: user.position_name || "-",
        role_name: user.role_name || "-",
        level: user.level || 1,
        points: user.points || 0,
        created_at: user.created_at ? new Date(user.created_at).toLocaleDateString("ru-RU") : "-",
      });
    });

    // Отправка файла
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=users_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Export users to Excel error:", error);
    next(error);
  }
}

/**
 * Сбросить прогресс пользователя по аттестации
 */
async function resetAssessmentProgress(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const userId = parseInt(req.params.userId, 10);
    const assessmentId = parseInt(req.params.assessmentId, 10);

    if (isNaN(userId) || isNaN(assessmentId)) {
      return res.status(400).json({ error: "Неверные параметры" });
    }

    // Проверяем существование пользователя
    const [users] = await connection.query("SELECT id, first_name, last_name FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Проверяем существование аттестации
    const [assessments] = await connection.query("SELECT id, title FROM assessments WHERE id = ?", [assessmentId]);
    if (assessments.length === 0) {
      return res.status(404).json({ error: "Аттестация не найдена" });
    }

    await connection.beginTransaction();

    // Получаем информацию о попытках перед удалением для логирования
    const [attempts] = await connection.query(
      `SELECT id, attempt_number, status, score_percent 
       FROM assessment_attempts 
       WHERE user_id = ? AND assessment_id = ?`,
      [userId, assessmentId],
    );

    // Удаляем ответы на вопросы
    await connection.query(
      `DELETE aa FROM assessment_answers aa
       INNER JOIN assessment_attempts at ON aa.attempt_id = at.id
       WHERE at.user_id = ? AND at.assessment_id = ?`,
      [userId, assessmentId],
    );

    // Удаляем попытки
    await connection.query("DELETE FROM assessment_attempts WHERE user_id = ? AND assessment_id = ?", [userId, assessmentId]);

    // Удаляем завершение теории
    await connection.query("DELETE FROM assessment_theory_completions WHERE user_id = ? AND assessment_id = ?", [userId, assessmentId]);

    await connection.commit();

    // Логируем действие
    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "user.assessment_progress_reset",
      entity: "assessment_attempt",
      entityId: assessmentId,
      metadata: {
        userId,
        assessmentId,
        deletedAttempts: attempts.length,
        attempts: attempts.map((a) => ({
          attemptNumber: a.attempt_number,
          status: a.status,
          scorePercent: a.score_percent,
        })),
        userName: `${users[0].first_name} ${users[0].last_name}`,
        assessmentTitle: assessments[0].title,
        resetBy: req.user.id,
      },
    });

    res.json({
      message: "Прогресс аттестации успешно сброшен",
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
 * Создать нового пользователя-администратора (только для суперадмина).
 * Сотрудников добавляют через инвайт-ссылку.
 */
async function createUser(req, res, next) {
  try {
    const currentUser = req.user;

    if (currentUser.role !== "superadmin") {
      return res.status(403).json({ error: "У вас нет прав на создание пользователей" });
    }

    const { firstName, lastName, branchId, positionId, roleId, login } = req.body;

    if (!firstName || !lastName || !branchId || !positionId || !roleId) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    // Авто-генерация логина из фамилии + первая буква имени
    let resolvedLogin = (login || "").trim();
    if (!resolvedLogin) {
      const base = (String(lastName).trim() + String(firstName).trim()[0]).toLowerCase().replace(/[^a-zа-яё0-9_]/g, "");
      resolvedLogin = base || `user_${Date.now()}`;
    }

    const [loginCheck] = await pool.query("SELECT id FROM users WHERE login = ?", [resolvedLogin]);
    if (loginCheck.length > 0) {
      return res.status(422).json({ error: "Логин уже занят, укажите другой" });
    }

    // Генерируем временный пароль
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    const tempPassword = Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Создаём пользователя без telegram_id — он предназначен только для admin-панели
    const [result] = await pool.query(
      `INSERT INTO users (first_name, last_name, position_id, branch_id, role_id, login, password, level, points)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [firstName, lastName, positionId, branchId, roleId, resolvedLogin, hashedPassword],
    );

    const [newUser] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.login, u.level, u.points,
              b.name as branch_name, p.name as position_name, r.name as role_name
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       LEFT JOIN positions p ON u.position_id = p.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [result.insertId],
    );

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "user.created",
      entity: "user",
      entityId: newUser[0].id,
      metadata: { branchId, positionId, roleId, login: resolvedLogin },
    });

    await assessmentModel.assignUserToMatchingAssessments({
      userId: newUser[0].id,
      branchId,
      positionId,
    });

    res.status(201).json({
      user: newUser[0],
      credentials: {
        login: resolvedLogin,
        password: tempPassword,
        message: `Данные для входа в административную панель:\nЛогин: ${resolvedLogin}\nПароль: ${tempPassword}\n\nПередайте пользователю и попросите сменить пароль после первого входа.`,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Сбросить пароль пользователя
 */
async function resetPassword(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const currentUser = req.user;

    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Пароль должен быть не менее 8 символов" });
    }

    const [users] = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?
         AND u.deleted_at IS NULL`,
      [userId],
    );
    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const targetUser = users[0];

    // Manager может сбрасывать пароли только employee (и себе)
    if (currentUser.role === "manager") {
      if (targetUser.id !== currentUser.id && targetUser.role_name !== "employee") {
        return res.status(403).json({
          error: "Вы можете сбрасывать пароли только сотрудникам с ролью employee",
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

    res.json({ message: "Пароль успешно сброшен" });
  } catch (error) {
    next(error);
  }
}

/**
 * Получить пользователя по ID
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
        AND u.deleted_at IS NULL
    `,
      [userId],
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Получить статистику пользователя
    const [stats] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT aa.id) as total_attempts,
        COUNT(DISTINCT CASE WHEN aa.status = 'completed' THEN aa.id END) as completed_attempts,
        AVG(aa.score) as avg_score
      FROM assessment_attempts aa
      WHERE aa.user_id = ?
    `,
      [userId],
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

function parseUserIds(input) {
  if (!Array.isArray(input)) {
    return [];
  }
  const unique = new Set();
  for (const value of input) {
    const id = Number(value);
    if (Number.isInteger(id) && id > 0) {
      unique.add(id);
    }
  }
  return [...unique];
}

function buildInClause(ids) {
  return ids.map(() => "?").join(", ");
}

async function bulkUpdateRole(req, res, next) {
  try {
    const userIds = parseUserIds(req.body?.userIds);
    const roleId = Number(req.body?.roleId);

    if (!userIds.length || !Number.isInteger(roleId) || roleId <= 0) {
      return res.status(400).json({ error: "Некорректные параметры массового изменения роли" });
    }

    const sql = `UPDATE users SET role_id = ? WHERE id IN (${buildInClause(userIds)})`;
    const [result] = await pool.query(sql, [roleId, ...userIds]);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "users.bulk.role.updated",
      entity: "users",
      entityId: null,
      metadata: {
        userIds,
        roleId,
        affectedRows: result.affectedRows,
      },
    });

    return res.json({
      affectedRows: result.affectedRows,
      userIds,
      roleId,
    });
  } catch (error) {
    next(error);
  }
}

async function bulkTransferBranch(req, res, next) {
  try {
    const userIds = parseUserIds(req.body?.userIds);
    const branchId = Number(req.body?.branchId);

    if (!userIds.length || !Number.isInteger(branchId) || branchId <= 0) {
      return res.status(400).json({ error: "Некорректные параметры массового перевода в филиал" });
    }

    const sql = `UPDATE users SET branch_id = ? WHERE id IN (${buildInClause(userIds)})`;
    const [result] = await pool.query(sql, [branchId, ...userIds]);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "users.bulk.branch.updated",
      entity: "users",
      entityId: null,
      metadata: {
        userIds,
        branchId,
        affectedRows: result.affectedRows,
      },
    });

    return res.json({
      affectedRows: result.affectedRows,
      userIds,
      branchId,
    });
  } catch (error) {
    next(error);
  }
}

function toCsv(rows) {
  if (!rows.length) {
    return "id,first_name,last_name,login,branch_name,position_name,role_name\n";
  }

  const headers = Object.keys(rows[0]);
  const escaped = (value) => {
    if (value == null) {
      return "";
    }
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escaped(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

async function bulkExportUsers(req, res, next) {
  try {
    const userIds = parseUserIds(req.body?.userIds);
    if (!userIds.length) {
      return res.status(400).json({ error: "Не выбраны пользователи для экспорта" });
    }

    const currentUser = req.user || {};
    const isManager = currentUser.role === "manager";
    const managerBranchId = Number(currentUser.branch_id || currentUser.branchId || 0);
    const managerBranchFilter = isManager && managerBranchId > 0 ? " AND u.branch_id = ?" : "";

    const [rows] = await pool.query(
      `
      SELECT u.id, u.first_name, u.last_name, u.login,
             b.name AS branch_name,
             p.name AS position_name,
             r.name AS role_name
      FROM users u
      LEFT JOIN branches b ON b.id = u.branch_id
      LEFT JOIN positions p ON p.id = u.position_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id IN (${buildInClause(userIds)})${managerBranchFilter}
      ORDER BY u.id ASC
      `,
      isManager && managerBranchId > 0 ? [...userIds, managerBranchId] : userIds,
    );

    const csv = toCsv(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=users_bulk_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

async function getPermissions(req, res, next) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор пользователя" });
    }

    const [users] = await pool.query("SELECT id FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!users.length) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const permissions = await permissionService.getEffectivePermissions(userId);
    return res.json({
      userId,
      effective: permissions.effective,
      inherited: permissions.inherited,
      overrides: permissions.overrides,
    });
  } catch (error) {
    return next(error);
  }
}

async function setPermissionOverride(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор пользователя" });
    }

    const { error, value } = permissionOverrideSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const [users] = await connection.query("SELECT id FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!users.length) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const [permissions] = await connection.query("SELECT id FROM permissions WHERE id = ? AND is_active = 1 LIMIT 1", [value.permissionId]);
    if (!permissions.length) {
      return res.status(422).json({ error: "Право не найдено или неактивно" });
    }

    const expiresAt = toMySqlDateTime(value.expiresAt);
    await connection.query(
      `INSERT INTO user_permission_overrides
        (user_id, permission_id, effect, reason, expires_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE
         effect = VALUES(effect),
         reason = VALUES(reason),
         expires_at = VALUES(expires_at),
         created_by = VALUES(created_by),
         updated_at = UTC_TIMESTAMP()`,
      [userId, value.permissionId, value.effect, value.reason || null, expiresAt, req.user?.id || null],
    );

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "user.permission.override.set",
      entity: "user",
      entityId: userId,
      metadata: {
        permissionId: value.permissionId,
        effect: value.effect,
        expiresAt: value.expiresAt || null,
      },
    });

    return res.status(200).json({ message: "Переопределение права сохранено" });
  } catch (error) {
    return next(error);
  } finally {
    connection.release();
  }
}

async function deletePermissionOverride(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const overrideId = Number(req.params.overrideId);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(overrideId) || overrideId <= 0) {
      return res.status(400).json({ error: "Некорректные параметры" });
    }

    const [result] = await pool.query("DELETE FROM user_permission_overrides WHERE id = ? AND user_id = ? LIMIT 1", [overrideId, userId]);

    if (!result.affectedRows) {
      return res.status(404).json({ error: "Переопределение не найдено" });
    }

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "user.permission.override.deleted",
      entity: "user",
      entityId: userId,
      metadata: { overrideId },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function addUserRole(req, res, next) {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор пользователя" });
    }

    const { error, value } = addUserRoleSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const [users] = await pool.query("SELECT id FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!users.length) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const [roles] = await pool.query("SELECT id FROM roles WHERE id = ? LIMIT 1", [value.roleId]);
    if (!roles.length) {
      return res.status(422).json({ error: "Роль не найдена" });
    }

    const expiresAt = toMySqlDateTime(value.expiresAt);
    await pool.query(
      `INSERT INTO user_roles
        (user_id, role_id, is_active, assigned_by, assigned_at, expires_at, created_at, updated_at)
       VALUES (?, ?, 1, ?, UTC_TIMESTAMP(), ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE
         is_active = 1,
         assigned_by = VALUES(assigned_by),
         assigned_at = UTC_TIMESTAMP(),
         expires_at = VALUES(expires_at),
         updated_at = UTC_TIMESTAMP()`,
      [userId, value.roleId, req.user?.id || null, expiresAt],
    );

    const [userRoles] = await pool.query(
      `SELECT
         ur.id,
         ur.role_id as roleId,
         r.name as roleName,
         ur.assigned_at as assignedAt,
         ur.expires_at as expiresAt,
         ur.assigned_by as assignedBy
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ? AND ur.is_active = 1
       ORDER BY ur.assigned_at DESC`,
      [userId],
    );

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "user.role.added",
      entity: "user",
      entityId: userId,
      metadata: { roleId: value.roleId, expiresAt: value.expiresAt || null },
    });

    return res.status(200).json({
      user: { id: userId },
      roles: userRoles,
    });
  } catch (error) {
    return next(error);
  }
}

async function removeUserRole(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const roleId = Number(req.params.roleId);
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(roleId) || roleId <= 0) {
      return res.status(400).json({ error: "Некорректные параметры" });
    }

    const [result] = await pool.query("DELETE FROM user_roles WHERE user_id = ? AND role_id = ? LIMIT 1", [userId, roleId]);

    if (!result.affectedRows) {
      return res.status(404).json({ error: "Роль пользователя не найдена" });
    }

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "user.role.removed",
      entity: "user",
      entityId: userId,
      metadata: { roleId },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

/**
 * Выдать существующему admin/manager доступ в клиентское приложение (бот).
 * Создаёт инвайт-приглашение, привязанное к уже существующему пользователю.
 * Если активное приглашение уже есть — возвращает его код.
 */
async function grantAppAccess(req, res, next) {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    const targetUserId = Number(req.params.id);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: "Некорректный ID пользователя" });
    }

    const user = await userModel.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const isAdmin = user.roleName === "superadmin" || user.roleName === "manager";
    if (!isAdmin) {
      return res.status(422).json({ error: "Сотрудникам доступ выдаётся через обычное приглашение" });
    }

    if (user.telegramId) {
      return res.status(422).json({ error: "Пользователь уже подключён к приложению" });
    }

    // Проверяем существующее активное приглашение
    const [activeRows] = await pool.query(`SELECT id, code FROM invitations WHERE invited_user_id = ? AND used_by IS NULL ORDER BY id DESC LIMIT 1`, [
      targetUserId,
    ]);

    let code;
    let invitationId;

    if (activeRows.length) {
      code = activeRows[0].code;
      invitationId = activeRows[0].id;
    } else {
      const employeeRole = await referenceModel.getRoleByName("employee");
      if (!employeeRole) {
        return res.status(500).json({ error: "Роль employee не настроена в системе" });
      }

      // Генерируем уникальный код
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateInviteCode();
        const [exists] = await pool.query("SELECT id FROM invitations WHERE code = ? AND used_by IS NULL LIMIT 1", [candidate]);
        if (!exists.length) {
          code = candidate;
          break;
        }
      }
      if (!code) {
        return res.status(500).json({ error: "Не удалось сгенерировать уникальный код" });
      }

      invitationId = await invitationModel.createInvitation({
        code,
        roleId: employeeRole.id,
        branchId: user.branchId,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phoneE164 || null,
        positionId: user.positionId || null,
        createdBy: req.user.id,
        invitedUserId: targetUserId,
      });
    }

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "user.app_access_granted",
      entity: "user",
      entityId: targetUserId,
      metadata: { invitationCode: code },
    });

    const invitation = await invitationModel.findById(invitationId);
    return res.json({ code, invitation });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers,
  getUserLoginHistory,
  updateUser,
  deleteUser,
  createUser,
  grantAppAccess,
  resetPassword,
  getUserById,
  getUserDetailedStats,
  getUserCourses,
  exportUsersToExcel,
  resetAssessmentProgress,
  bulkUpdateRole,
  bulkTransferBranch,
  bulkExportUsers,
  getPermissions,
  setPermissionOverride,
  deletePermissionOverride,
  addUserRole,
  removeUserRole,
};
