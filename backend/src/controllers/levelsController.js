const { pool } = require("../config/database");
const { createLog } = require("./adminLogsController");

/**
 * Получить все уровни
 */
exports.getLevels = async (req, res, next) => {
  try {
    const [levels] = await pool.query(
      `SELECT level_number, code, name, description, min_points, color, 
              icon_url, is_active, sort_order, created_at, updated_at 
       FROM gamification_levels 
       ORDER BY level_number ASC`
    );

    res.json({ levels });
  } catch (error) {
    console.error("Get levels error:", error);
    next(error);
  }
};

/**
 * Получить уровень по номеру
 */
exports.getLevelByNumber = async (req, res, next) => {
  try {
    const { level_number } = req.params;

    const [levels] = await pool.query(
      `SELECT level_number, code, name, description, min_points, color, 
              icon_url, is_active, sort_order, created_at, updated_at 
       FROM gamification_levels 
       WHERE level_number = ?`,
      [level_number]
    );

    if (levels.length === 0) {
      return res.status(404).json({ error: "Уровень не найден" });
    }

    res.json({ level: levels[0] });
  } catch (error) {
    console.error("Get level by number error:", error);
    next(error);
  }
};

/**
 * Создать новый уровень
 */
exports.createLevel = async (req, res, next) => {
  try {
    const { level_number, code, name, description, min_points, color, is_active, sort_order } = req.body;

    if (!level_number || !code || !name || min_points === undefined) {
      return res.status(400).json({ error: "Номер уровня, код, название и минимальные очки обязательны" });
    }

    // Проверить уникальность номера уровня и кода
    const [existingLevel] = await pool.query("SELECT level_number FROM gamification_levels WHERE level_number = ?", [level_number]);
    if (existingLevel.length > 0) {
      return res.status(400).json({ error: "Уровень с таким номером уже существует" });
    }

    const [existingCode] = await pool.query("SELECT level_number FROM gamification_levels WHERE code = ?", [code]);
    if (existingCode.length > 0) {
      return res.status(400).json({ error: "Уровень с таким кодом уже существует" });
    }

    await pool.query(
      `INSERT INTO gamification_levels 
       (level_number, code, name, description, min_points, color, is_active, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        level_number,
        code,
        name,
        description || null,
        min_points,
        color || "#6366F1",
        is_active !== undefined ? is_active : 1,
        sort_order || level_number,
      ]
    );

    // Логирование
    await createLog(req.user.id, "CREATE", `Создан уровень: ${name} (${level_number}) с порогом ${min_points} очков`, "level", level_number, req);

    res.status(201).json({ message: "Уровень создан успешно" });
  } catch (error) {
    console.error("Create level error:", error);
    next(error);
  }
};

/**
 * Обновить уровень
 */
exports.updateLevel = async (req, res, next) => {
  try {
    const { level_number } = req.params;
    const { name, description, min_points, color, is_active, sort_order } = req.body;

    // Проверить существование
    const [existing] = await pool.query("SELECT level_number, name, min_points FROM gamification_levels WHERE level_number = ?", [level_number]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Уровень не найден" });
    }

    const oldData = existing[0];

    await pool.query(
      `UPDATE gamification_levels 
       SET name = ?, description = ?, min_points = ?, color = ?, is_active = ?, sort_order = ?
       WHERE level_number = ?`,
      [name, description || null, min_points, color || "#6366F1", is_active !== undefined ? is_active : 1, sort_order || level_number, level_number]
    );

    // Логирование
    await createLog(
      req.user.id,
      "UPDATE",
      `Обновлен уровень ${level_number}: ${name} (порог: ${oldData.min_points} → ${min_points})`,
      "level",
      level_number,
      req
    );

    res.json({ message: "Уровень обновлен успешно" });
  } catch (error) {
    console.error("Update level error:", error);
    next(error);
  }
};

/**
 * Удалить уровень
 */
exports.deleteLevel = async (req, res, next) => {
  try {
    const { level_number } = req.params;

    // Проверить существование
    const [levels] = await pool.query("SELECT level_number, name FROM gamification_levels WHERE level_number = ?", [level_number]);
    if (levels.length === 0) {
      return res.status(404).json({ error: "Уровень не найден" });
    }

    const level = levels[0];

    // Проверить, есть ли пользователи с этим уровнем
    const [users] = await pool.query("SELECT COUNT(*) as count FROM users WHERE level = ?", [level_number]);
    if (users[0].count > 0) {
      return res.status(400).json({
        error: `Невозможно удалить уровень. Есть ${users[0].count} пользователей с этим уровнем. Переведите их на другой уровень сначала.`,
      });
    }

    await pool.query("DELETE FROM gamification_levels WHERE level_number = ?", [level_number]);

    // Логирование
    await createLog(req.user.id, "DELETE", `Удален уровень: ${level.name} (${level_number})`, "level", level_number, req);

    res.status(204).send();
  } catch (error) {
    console.error("Delete level error:", error);
    next(error);
  }
};

/**
 * Пересчитать уровни всех пользователей
 */
exports.recalculateLevels = async (req, res, next) => {
  let connection;
  try {
    // Получить все уровни отсортированные по min_points
    const [levels] = await pool.query("SELECT level_number, min_points FROM gamification_levels WHERE is_active = 1 ORDER BY min_points DESC");

    if (levels.length === 0) {
      return res.status(400).json({ error: "Нет активных уровней" });
    }

    // Получить всех пользователей с их очками
    const [users] = await pool.query("SELECT id, points FROM users");

    connection = await pool.getConnection();
    await connection.beginTransaction();

    let updatedCount = 0;

    for (const user of users) {
      // Найти подходящий уровень для пользователя
      let userLevel = levels[levels.length - 1].level_number; // по умолчанию самый низкий уровень

      for (const level of levels) {
        if (user.points >= level.min_points) {
          userLevel = level.level_number;
          break;
        }
      }

      // Обновить уровень пользователя если изменился
      await connection.query("UPDATE users SET level = ? WHERE id = ?", [userLevel, user.id]);
      updatedCount++;
    }

    await connection.commit();

    // Логирование
    if (req.user && req.user.id) {
      await createLog(req.user.id, "UPDATE", `Пересчитаны уровни для ${updatedCount} пользователей`, "level", null, req);
    }

    res.json({
      message: `Уровни пересчитаны для ${updatedCount} пользователей`,
      updatedCount,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Recalculate levels error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Ошибка при пересчёте уровней",
      details: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Получить статистику по уровням
 */
exports.getLevelsStats = async (req, res, next) => {
  try {
    const [stats] = await pool.query(
      `SELECT 
        l.level_number,
        l.name,
        l.min_points,
        l.color,
        COUNT(u.id) as users_count
      FROM gamification_levels l
      LEFT JOIN users u ON u.level = l.level_number
      WHERE l.is_active = 1
      GROUP BY l.level_number, l.name, l.min_points, l.color
      ORDER BY l.level_number ASC`
    );

    res.json({ stats });
  } catch (error) {
    console.error("Get levels stats error:", error);
    next(error);
  }
};
