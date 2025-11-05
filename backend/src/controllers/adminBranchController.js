const { pool } = require("../config/database");
const { sendTelegramLog } = require("../services/telegramLogger");
const { createLog } = require("./adminLogsController");

/**
 * Получить список филиалов
 */
exports.getBranches = async (req, res, next) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        b.id,
        b.name,
        b.city,
        b.created_at,
        COUNT(DISTINCT u.id) as employees_count,
        COUNT(DISTINCT aa.id) as assessments_completed,
        AVG(aa.score_percent) as avg_score,
        GROUP_CONCAT(DISTINCT CONCAT(m.first_name, ' ', m.last_name) SEPARATOR ', ') as managers
      FROM branches b
      LEFT JOIN users u ON b.id = u.branch_id
      LEFT JOIN assessment_attempts aa ON u.id = aa.user_id AND aa.status = 'completed'
      LEFT JOIN branch_managers bm ON b.id = bm.branch_id
      LEFT JOIN users m ON bm.user_id = m.id
      LEFT JOIN roles mr ON m.role_id = mr.id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += " AND (b.name LIKE ? OR b.city LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " AND (mr.name IN ('manager', 'superadmin') OR mr.name IS NULL)";
    query += " GROUP BY b.id ORDER BY b.name ASC";

    const [branches] = await pool.query(query, params);

    res.json({ branches });
  } catch (error) {
    console.error("Get branches error:", error);
    next(error);
  }
};

/**
 * Получить филиал по ID
 */
exports.getBranchById = async (req, res, next) => {
  try {
    const branchId = Number(req.params.id);

    const [branches] = await pool.query("SELECT * FROM branches WHERE id = ?", [branchId]);

    if (branches.length === 0) {
      return res.status(404).json({ error: "Филиал не найден" });
    }

    // Получить количество сотрудников и управляющих
    const [stats] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT u.id) as employees_count,
        COUNT(DISTINCT aa.id) as assessments_completed,
        AVG(aa.score_percent) as avg_score
      FROM users u
      LEFT JOIN assessment_attempts aa ON u.id = aa.user_id AND aa.status = 'completed'
      WHERE u.branch_id = ?
    `,
      [branchId]
    );

    // Получить список управляющих
    const [managers] = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.telegram_id,
        bm.assigned_at
      FROM branch_managers bm
      JOIN users u ON bm.user_id = u.id
      WHERE bm.branch_id = ?
      ORDER BY bm.assigned_at DESC
    `,
      [branchId]
    );

    res.json({
      branch: {
        ...branches[0],
        ...stats[0],
        managers,
      },
    });
  } catch (error) {
    console.error("Get branch by ID error:", error);
    next(error);
  }
};

/**
 * Создать новый филиал
 */
exports.createBranch = async (req, res, next) => {
  try {
    const { name, city } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Название филиала обязательно" });
    }

    // Проверить уникальность названия
    const [existing] = await pool.query("SELECT id FROM branches WHERE name = ?", [name.trim()]);

    if (existing.length > 0) {
      return res.status(400).json({ error: "Филиал с таким названием уже существует" });
    }

    const [result] = await pool.query("INSERT INTO branches (name, city) VALUES (?, ?)", [name.trim(), city?.trim() || null]);

    // Логирование
    await createLog(req.user.id, "CREATE", `Создан филиал "${name}"${city ? ` в городе ${city}` : ""}`, "branch", result.insertId, req);

    await sendTelegramLog(
      `🏢 <b>Создан филиал</b>\n` + `ID: ${result.insertId}\n` + `Название: ${name}\n` + (city ? `Город: ${city}\n` : "") + `Создал: ${req.user.id}`
    );

    res.status(201).json({
      branchId: result.insertId,
      message: "Филиал создан успешно",
    });
  } catch (error) {
    console.error("Create branch error:", error);
    next(error);
  }
};

/**
 * Обновить филиал
 */
exports.updateBranch = async (req, res, next) => {
  try {
    const branchId = Number(req.params.id);
    const { name, city } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Название филиала обязательно" });
    }

    // Проверить существование
    const [branches] = await pool.query("SELECT id, name, city FROM branches WHERE id = ?", [branchId]);

    if (branches.length === 0) {
      return res.status(404).json({ error: "Филиал не найден" });
    }

    // Проверить уникальность названия (кроме текущего)
    const [existing] = await pool.query("SELECT id FROM branches WHERE name = ? AND id != ?", [name.trim(), branchId]);

    if (existing.length > 0) {
      return res.status(400).json({ error: "Филиал с таким названием уже существует" });
    }

    await pool.query("UPDATE branches SET name = ?, city = ? WHERE id = ?", [name.trim(), city?.trim() || null, branchId]);

    // Логирование
    await createLog(
      req.user.id,
      "UPDATE",
      `Обновлен филиал: "${branches[0].name}" → "${name}"${city !== branches[0].city ? `, город: ${city || "не указан"}` : ""}`,
      "branch",
      branchId,
      req
    );

    await sendTelegramLog(
      `✏️ <b>Обновлен филиал</b>\n` +
        `ID: ${branchId}\n` +
        `Старое название: ${branches[0].name}\n` +
        `Новое название: ${name}\n` +
        (city !== branches[0].city ? `Город: ${city || "не указан"}\n` : "") +
        `Обновил: ${req.user.id}`
    );

    res.json({ message: "Филиал обновлен успешно" });
  } catch (error) {
    console.error("Update branch error:", error);
    next(error);
  }
};

/**
 * Удалить филиал
 */
exports.deleteBranch = async (req, res, next) => {
  try {
    const branchId = Number(req.params.id);

    // Проверить существование
    const [branches] = await pool.query("SELECT name FROM branches WHERE id = ?", [branchId]);

    if (branches.length === 0) {
      return res.status(404).json({ error: "Филиал не найден" });
    }

    // Проверить, есть ли сотрудники в филиале
    const [users] = await pool.query("SELECT COUNT(*) as count FROM users WHERE branch_id = ?", [branchId]);

    if (users[0].count > 0) {
      return res.status(400).json({
        error: `Невозможно удалить филиал. В нем ${users[0].count} сотрудников. Сначала переместите или удалите сотрудников.`,
      });
    }

    await pool.query("DELETE FROM branches WHERE id = ?", [branchId]);

    // Логирование
    await createLog(req.user.id, "DELETE", `Удален филиал "${branches[0].name}"`, "branch", branchId, req);

    await sendTelegramLog(`🗑️ <b>Удален филиал</b>\n` + `ID: ${branchId}\n` + `Название: ${branches[0].name}\n` + `Удалил: ${req.user.id}`);

    res.status(204).send();
  } catch (error) {
    console.error("Delete branch error:", error);
    next(error);
  }
};

/**
 * Назначить управляющего к филиалу
 */
exports.assignManager = async (req, res, next) => {
  try {
    const branchId = Number(req.params.id);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "ID пользователя обязателен" });
    }

    // Проверить существование филиала
    const [branches] = await pool.query("SELECT name FROM branches WHERE id = ?", [branchId]);
    if (branches.length === 0) {
      return res.status(404).json({ error: "Филиал не найден" });
    }

    // Проверить существование пользователя и его роль
    const [users] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    if (users[0].role_name !== "manager" && users[0].role_name !== "superadmin") {
      return res.status(400).json({ error: "Пользователь не является управляющим или суперадмином" });
    }

    // Проверить, не назначен ли уже
    const [existing] = await pool.query("SELECT id FROM branch_managers WHERE branch_id = ? AND user_id = ?", [branchId, userId]);

    if (existing.length > 0) {
      return res.status(400).json({ error: "Этот управляющий уже назначен к данному филиалу" });
    }

    await pool.query("INSERT INTO branch_managers (branch_id, user_id) VALUES (?, ?)", [branchId, userId]);

    // Логирование
    await createLog(
      req.user.id,
      "ASSIGN",
      `Назначен управляющий ${users[0].first_name} ${users[0].last_name} к филиалу "${branches[0].name}"`,
      "branch_manager",
      branchId,
      req
    );

    await sendTelegramLog(
      `👤 <b>Назначен управляющий</b>\n` +
        `Филиал: ${branches[0].name} (ID: ${branchId})\n` +
        `Управляющий: ${users[0].first_name} ${users[0].last_name} (ID: ${userId})\n` +
        `Назначил: ${req.user.id}`
    );

    res.json({ message: "Управляющий назначен успешно" });
  } catch (error) {
    console.error("Assign manager error:", error);
    next(error);
  }
};

/**
 * Удалить управляющего из филиала
 */
exports.removeManager = async (req, res, next) => {
  try {
    const branchId = Number(req.params.id);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "ID пользователя обязателен" });
    }

    const [branches] = await pool.query("SELECT name FROM branches WHERE id = ?", [branchId]);
    if (branches.length === 0) {
      return res.status(404).json({ error: "Филиал не найден" });
    }

    const [users] = await pool.query("SELECT first_name, last_name FROM users WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const [result] = await pool.query("DELETE FROM branch_managers WHERE branch_id = ? AND user_id = ?", [branchId, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Назначение не найдено" });
    }

    // Логирование
    await createLog(
      req.user.id,
      "REMOVE",
      `Удален управляющий ${users[0].first_name} ${users[0].last_name} из филиала "${branches[0].name}"`,
      "branch_manager",
      branchId,
      req
    );

    await sendTelegramLog(
      `❌ <b>Удален управляющий</b>\n` +
        `Филиал: ${branches[0].name} (ID: ${branchId})\n` +
        `Управляющий: ${users[0].first_name} ${users[0].last_name} (ID: ${userId})\n` +
        `Удалил: ${req.user.id}`
    );

    res.json({ message: "Управляющий удален успешно" });
  } catch (error) {
    console.error("Remove manager error:", error);
    next(error);
  }
};

/**
 * Массовое назначение управляющего к нескольким филиалам
 */
exports.assignManagerToBranches = async (req, res, next) => {
  try {
    const { userId, branchIds } = req.body;

    if (!userId || !Array.isArray(branchIds) || branchIds.length === 0) {
      return res.status(400).json({ error: "ID пользователя и список филиалов обязательны" });
    }

    // Проверить пользователя
    const [users] = await pool.query(
      `
      SELECT u.id, u.first_name, u.last_name, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `,
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    if (users[0].role_name !== "manager" && users[0].role_name !== "superadmin") {
      return res.status(400).json({ error: "Пользователь не является управляющим или суперадмином" });
    }

    // Проверить существование всех филиалов
    const [branches] = await pool.query(`SELECT id, name FROM branches WHERE id IN (?)`, [branchIds]);
    if (branches.length !== branchIds.length) {
      return res.status(404).json({ error: "Один или несколько филиалов не найдены" });
    }

    // Удалить старые назначения этого пользователя
    await pool.query("DELETE FROM branch_managers WHERE user_id = ?", [userId]);

    // Добавить новые назначения
    const values = branchIds.map((branchId) => [branchId, userId]);
    await pool.query("INSERT IGNORE INTO branch_managers (branch_id, user_id) VALUES ?", [values]);

    // Логирование
    await createLog(
      req.user.id,
      "ASSIGN_MULTIPLE",
      `Массовое назначение: ${users[0].first_name} ${users[0].last_name} назначен к ${branches.length} филиалам`,
      "branch_manager",
      userId,
      req
    );

    await sendTelegramLog(
      `👥 <b>Массовое назначение управляющего</b>\n` +
        `Управляющий: ${users[0].first_name} ${users[0].last_name} (ID: ${userId})\n` +
        `Филиалы: ${branches.map((b) => b.name).join(", ")}\n` +
        `Назначил: ${req.user.id}`
    );

    res.json({ message: "Управляющий назначен к выбранным филиалам успешно" });
  } catch (error) {
    console.error("Assign manager to branches error:", error);
    next(error);
  }
};

/**
 * Получить список управляющих (для выбора)
 */
exports.getManagers = async (req, res, next) => {
  try {
    const [managers] = await pool.query(
      `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.telegram_id,
        r.name as role_name,
        COUNT(DISTINCT bm.branch_id) as branches_count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN branch_managers bm ON u.id = bm.user_id
      WHERE r.name IN ('manager', 'superadmin')
      GROUP BY u.id
      ORDER BY u.first_name, u.last_name
    `
    );

    res.json({
      managers: managers.map((manager) => ({
        ...manager,
        role: manager.role_name,
      })),
    });
  } catch (error) {
    console.error("Get managers error:", error);
    next(error);
  }
};
