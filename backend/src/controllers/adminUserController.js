const Joi = require("joi");
const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const { pool } = require("../config/database");
const { sendTelegramLog } = require("../services/telegramLogger");
const { sendUserNotification } = require("../services/telegramNotifier");
const referenceModel = require("../models/referenceModel");
const { createLog } = require("./adminLogsController");

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

    // Если пользователь - manager, показываем только пользователей его филиала
    if (currentUser.role === "manager") {
      const [managerData] = await pool.query("SELECT branch_id FROM users WHERE id = ?", [currentUser.id]);
      if (managerData[0]?.branch_id) {
        query += " AND u.branch_id = ?";
        params.push(managerData[0].branch_id);
      }
    }

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
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const existing = await userModel.findById(userId);
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
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

    // Добавляем логин в payload, если он был передан
    if (value.login !== undefined) {
      payload.login = value.login.trim() || null;
    }

    await userModel.updateUserByAdmin(userId, payload);
    const updated = await userModel.findById(userId);

    if (existing.telegramId) {
      await sendUserNotification(existing.telegramId, "Ваш профиль обновлен администратором. Проверьте информацию в мини-приложении.");
    }

    // Логирование действия
    await createLog(req.user.id, "UPDATE", `Обновлен пользователь: ${updated.firstName} ${updated.lastName} (ID: ${userId})`, "user", userId, req);

    await sendTelegramLog(
      `🛠 <b>Обновление пользователя</b>\n` +
        `ID: ${updated.id}\n` +
        `Имя: ${updated.firstName} ${updated.lastName}\n` +
        `Роль: ${updated.roleName}\n` +
        `Обновил: ${req.user.id}`
    );

    res.json({ user: updated });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const existing = await userModel.findById(userId);
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: "Нельзя удалить самого себя" });
    }

    await sendUserNotification(existing.telegramId, "Ваш аккаунт был удален администратором. Для доступа обратитесь к руководству.");

    await userModel.deleteUser(userId);

    // Логирование действия
    await createLog(req.user.id, "DELETE", `Удален пользователь: ${existing.firstName} ${existing.lastName} (ID: ${userId})`, "user", userId, req);

    await sendTelegramLog(
      `🗑️ <b>Удаление пользователя</b>\n` + `ID: ${existing.id}\n` + `Имя: ${existing.firstName} ${existing.lastName}\n` + `Удалил: ${req.user.id}`
    );

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

    // Основная информация
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
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Статистика аттестаций
    const [assessmentStats] = await pool.query(
      `SELECT 
        COUNT(DISTINCT aa.assessment_id) as total_assessments,
        COUNT(DISTINCT CASE WHEN aa.status = 'completed' THEN aa.id END) as completed_attempts,
        AVG(CASE WHEN aa.status = 'completed' THEN aa.score_percent END) as avg_score,
        SUM(CASE WHEN aa.score_percent >= 90 THEN 1 ELSE 0 END) as excellent_count,
        SUM(CASE WHEN aa.score_percent >= 70 AND aa.score_percent < 90 THEN 1 ELSE 0 END) as good_count,
        MIN(aa.started_at) as first_attempt_date,
        MAX(aa.completed_at) as last_attempt_date
      FROM assessment_attempts aa
      WHERE aa.user_id = ?`,
      [userId]
    );

    // История аттестаций
    const [assessmentHistory] = await pool.query(
      `SELECT 
        a.id, a.title,
        aa.attempt_number,
        aa.status,
        aa.score_percent,
        aa.correct_answers,
        aa.total_questions,
        aa.time_spent_seconds,
        aa.started_at,
        aa.completed_at
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE aa.user_id = ?
      ORDER BY aa.started_at DESC
      LIMIT 10`,
      [userId]
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
      [userId]
    );

    // Рейтинг
    const [rankData] = await pool.query(
      `SELECT 
        (SELECT COUNT(*) + 1 FROM users WHERE points > ?) as user_rank,
        (SELECT COUNT(*) FROM users WHERE role_id IN (SELECT id FROM roles WHERE name = 'employee')) as total_users
      FROM DUAL`,
      [users[0].points]
    );

    // Прогресс до следующего уровня
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
      history: assessmentHistory,
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
        login: user.login || "—",
        telegram_id: user.telegram_id || "—",
        branch_name: user.branch_name || "—",
        position_name: user.position_name || "—",
        role_name: user.role_name || "—",
        level: user.level || 1,
        points: user.points || 0,
        created_at: user.created_at ? new Date(user.created_at).toLocaleDateString("ru-RU") : "—",
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

module.exports = {
  listUsers,
  updateUser,
  deleteUser,
  createUser,
  resetPassword,
  getUserById,
  getUserDetailedStats,
  exportUsersToExcel,
};

/**
 * Создать нового пользователя (только для суперадмина)
 */
async function createUser(req, res, next) {
  try {
    const { firstName, lastName, branchId, positionId, roleId, login, password } = req.body;

    // Валидация
    if (!firstName || !lastName || !branchId || !positionId || !roleId) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    // Проверка уникальности логина
    if (login) {
      const [existing] = await pool.query("SELECT id FROM users WHERE login = ?", [login]);
      if (existing.length > 0) {
        return res.status(400).json({ error: "Логин уже занят" });
      }
    }

    // Хешируем пароль, если указан
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Генерируем уникальный telegram_id для ручного создания
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

    // Логирование действия
    await createLog(
      req.user.id,
      "CREATE",
      `Создан пользователь: ${newUser[0].first_name} ${newUser[0].last_name} (ID: ${newUser[0].id})`,
      "user",
      newUser[0].id,
      req
    );

    await sendTelegramLog(
      `➕ <b>Создан новый пользователь</b>\n` +
        `ID: ${newUser[0].id}\n` +
        `Имя: ${newUser[0].first_name} ${newUser[0].last_name}\n` +
        `Роль: ${newUser[0].role_name}\n` +
        `Создал: ${req.user.id}`
    );

    res.status(201).json({ user: newUser[0] });
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
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
    }

    const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

    // Логирование действия
    await createLog(req.user.id, "UPDATE", `Сброшен пароль пользователя ID: ${userId}`, "user", userId, req);

    await sendTelegramLog(`🔑 <b>Сброс пароля</b>\n` + `Пользователь ID: ${userId}\n` + `Сбросил: ${req.user.id}`);

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
    `,
      [userId]
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
