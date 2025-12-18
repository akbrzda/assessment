const { pool } = require("../config/database");
const { logAndSend, buildActorFromRequest } = require("../services/auditService");

const normalizeVisibilityFlag = (value, defaultValue = true) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return Boolean(value);
};

/**
 * Получить список должностей
 */
exports.getPositions = async (req, res, next) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        p.id,
        p.name,
        p.is_visible_in_miniapp,
        p.created_at,
        COUNT(DISTINCT u.id) as employees_count,
        COUNT(DISTINCT aa.id) as assessments_completed,
        AVG(aa.score_percent) as avg_score
      FROM positions p
      LEFT JOIN users u ON p.id = u.position_id
      LEFT JOIN assessment_attempts aa ON u.id = aa.user_id AND aa.status = 'completed'
      WHERE 1 = 1
    `;

    const params = [];

    if (search) {
      query += " AND p.name LIKE ?";
      params.push(`%${search}%`);
    }

    query += " GROUP BY p.id ORDER BY p.id ASC";

    const [positions] = await pool.query(query, params);

    res.json({ positions });
  } catch (error) {
    console.error("Get positions error:", error);
    next(error);
  }
};

/**
 * Получить должность по ID
 */
exports.getPositionById = async (req, res, next) => {
  try {
    const positionId = Number(req.params.id);

    const [positions] = await pool.query("SELECT * FROM positions WHERE id = ?", [positionId]);

    if (positions.length === 0) {
      return res.status(404).json({ error: "Должность не найдена" });
    }

    const [stats] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT u.id) as employees_count,
        COUNT(DISTINCT aa.id) as assessments_completed,
        AVG(aa.score_percent) as avg_score
      FROM users u
      LEFT JOIN assessment_attempts aa ON u.id = aa.user_id AND aa.status = 'completed'
      WHERE u.position_id = ?
    `,
      [positionId]
    );

    res.json({
      position: {
        ...positions[0],
        ...stats[0],
      },
    });
  } catch (error) {
    console.error("Get position by ID error:", error);
    next(error);
  }
};

/**
 * Создать новою должность
 */
exports.createPosition = async (req, res, next) => {
  try {
    const { name, isVisibleInMiniapp } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Название должности обязательно" });
    }

    const normalizedName = name.trim();
    const visibility = normalizeVisibilityFlag(isVisibleInMiniapp);

    const [existing] = await pool.query("SELECT id FROM positions WHERE name = ?", [normalizedName]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Должность с таким названием уже существует" });
    }

    const [result] = await pool.query("INSERT INTO positions (name, is_visible_in_miniapp) VALUES (?, ?)", [normalizedName, visibility ? 1 : 0]);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "position.created",
      entity: "position",
      entityId: result.insertId,
      metadata: {
        name: normalizedName,
        isVisibleInMiniapp: visibility,
      },
    });

    res.status(201).json({
      positionId: result.insertId,
      message: "Должность создана успешно",
    });
  } catch (error) {
    console.error("Create position error:", error);
    next(error);
  }
};

/**
 * Обновить должность
 */
exports.updatePosition = async (req, res, next) => {
  try {
    const positionId = Number(req.params.id);
    const { name, isVisibleInMiniapp } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Название должности обязательно" });
    }

    const normalizedName = name.trim();
    const [positions] = await pool.query("SELECT id, name, is_visible_in_miniapp FROM positions WHERE id = ?", [positionId]);

    if (positions.length === 0) {
      return res.status(404).json({ error: "Должность не найдена" });
    }

    const visibility = normalizeVisibilityFlag(isVisibleInMiniapp, positions[0].is_visible_in_miniapp === 1);

    const [existing] = await pool.query("SELECT id FROM positions WHERE name = ? AND id != ?", [normalizedName, positionId]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Должность с таким названием уже существует" });
    }

    await pool.query("UPDATE positions SET name = ?, is_visible_in_miniapp = ? WHERE id = ?", [
      normalizedName,
      visibility ? 1 : 0,
      positionId,
    ]);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "position.updated",
      entity: "position",
      entityId: positionId,
      metadata: {
        previousName: positions[0].name,
        name: normalizedName,
        previousVisibility: positions[0].is_visible_in_miniapp === 1,
        isVisibleInMiniapp: visibility,
      },
    });

    res.json({ message: "Должность обновлена успешно" });
  } catch (error) {
    console.error("Update position error:", error);
    next(error);
  }
};

/**
 * Удалить должность
 */
exports.deletePosition = async (req, res, next) => {
  try {
    const positionId = Number(req.params.id);

    const [positions] = await pool.query("SELECT name FROM positions WHERE id = ?", [positionId]);
    if (positions.length === 0) {
      return res.status(404).json({ error: "Должность не найдена" });
    }

    const [users] = await pool.query("SELECT COUNT(*) as count FROM users WHERE position_id = ?", [positionId]);

    if (users[0].count > 0) {
      return res.status(400).json({
        error: `Невозможно удалить должность. ${users[0].count} сотрудников используют ее.`,
      });
    }

    await pool.query("DELETE FROM positions WHERE id = ?", [positionId]);

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "position.deleted",
      entity: "position",
      entityId: positionId,
      metadata: {
        name: positions[0].name,
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Delete position error:", error);
    next(error);
  }
};
