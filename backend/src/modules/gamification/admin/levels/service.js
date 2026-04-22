const { pool } = require("../../../../config/database");
const { createLog } = require("../../../../services/adminLogService");

/**
 * РџРѕР»СѓС‡РёС‚СЊ РІСЃРµ СѓСЂРѕРІРЅРё
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
 * РџРѕР»СѓС‡РёС‚СЊ СѓСЂРѕРІРµРЅСЊ РїРѕ РЅРѕРјРµСЂСѓ
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
      return res.status(404).json({ error: "РЈСЂРѕРІРµРЅСЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    res.json({ level: levels[0] });
  } catch (error) {
    console.error("Get level by number error:", error);
    next(error);
  }
};

/**
 * РЎРѕР·РґР°С‚СЊ РЅРѕРІС‹Р№ СѓСЂРѕРІРµРЅСЊ
 */
exports.createLevel = async (req, res, next) => {
  try {
    const { level_number, code, name, description, min_points, color, is_active, sort_order } = req.body;

    if (!level_number || !code || !name || min_points === undefined) {
      return res.status(400).json({ error: "РќРѕРјРµСЂ СѓСЂРѕРІРЅСЏ, РєРѕРґ, РЅР°Р·РІР°РЅРёРµ Рё РјРёРЅРёРјР°Р»СЊРЅС‹Рµ РѕС‡РєРё РѕР±СЏР·Р°С‚РµР»СЊРЅС‹" });
    }

    // РџСЂРѕРІРµСЂРёС‚СЊ СѓРЅРёРєР°Р»СЊРЅРѕСЃС‚СЊ РЅРѕРјРµСЂР° СѓСЂРѕРІРЅСЏ Рё РєРѕРґР°
    const [existingLevel] = await pool.query("SELECT level_number FROM gamification_levels WHERE level_number = ?", [level_number]);
    if (existingLevel.length > 0) {
      return res.status(400).json({ error: "РЈСЂРѕРІРµРЅСЊ СЃ С‚Р°РєРёРј РЅРѕРјРµСЂРѕРј СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚" });
    }

    const [existingCode] = await pool.query("SELECT level_number FROM gamification_levels WHERE code = ?", [code]);
    if (existingCode.length > 0) {
      return res.status(400).json({ error: "РЈСЂРѕРІРµРЅСЊ СЃ С‚Р°РєРёРј РєРѕРґРѕРј СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚" });
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

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ
    await createLog(req.user.id, "CREATE", `РЎРѕР·РґР°РЅ СѓСЂРѕРІРµРЅСЊ: ${name} (${level_number}) СЃ РїРѕСЂРѕРіРѕРј ${min_points} РѕС‡РєРѕРІ`, "level", level_number, req);

    res.status(201).json({ message: "РЈСЂРѕРІРµРЅСЊ СЃРѕР·РґР°РЅ СѓСЃРїРµС€РЅРѕ" });
  } catch (error) {
    console.error("Create level error:", error);
    next(error);
  }
};

/**
 * РћР±РЅРѕРІРёС‚СЊ СѓСЂРѕРІРµРЅСЊ
 */
exports.updateLevel = async (req, res, next) => {
  try {
    const { level_number } = req.params;
    const { name, description, min_points, color, is_active, sort_order } = req.body;

    // РџСЂРѕРІРµСЂРёС‚СЊ СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ
    const [existing] = await pool.query("SELECT level_number, name, min_points FROM gamification_levels WHERE level_number = ?", [level_number]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "РЈСЂРѕРІРµРЅСЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    const oldData = existing[0];

    await pool.query(
      `UPDATE gamification_levels 
       SET name = ?, description = ?, min_points = ?, color = ?, is_active = ?, sort_order = ?
       WHERE level_number = ?`,
      [name, description || null, min_points, color || "#6366F1", is_active !== undefined ? is_active : 1, sort_order || level_number, level_number]
    );

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ
    await createLog(
      req.user.id,
      "UPDATE",
      `РћР±РЅРѕРІР»РµРЅ СѓСЂРѕРІРµРЅСЊ ${level_number}: ${name} (РїРѕСЂРѕРі: ${oldData.min_points} в†’ ${min_points})`,
      "level",
      level_number,
      req
    );

    res.json({ message: "РЈСЂРѕРІРµРЅСЊ РѕР±РЅРѕРІР»РµРЅ СѓСЃРїРµС€РЅРѕ" });
  } catch (error) {
    console.error("Update level error:", error);
    next(error);
  }
};

/**
 * РЈРґР°Р»РёС‚СЊ СѓСЂРѕРІРµРЅСЊ
 */
exports.deleteLevel = async (req, res, next) => {
  try {
    const { level_number } = req.params;

    // РџСЂРѕРІРµСЂРёС‚СЊ СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ
    const [levels] = await pool.query("SELECT level_number, name FROM gamification_levels WHERE level_number = ?", [level_number]);
    if (levels.length === 0) {
      return res.status(404).json({ error: "РЈСЂРѕРІРµРЅСЊ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    const level = levels[0];

    // РџСЂРѕРІРµСЂРёС‚СЊ, РµСЃС‚СЊ Р»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»Рё СЃ СЌС‚РёРј СѓСЂРѕРІРЅРµРј
    const [users] = await pool.query("SELECT COUNT(*) as count FROM users WHERE level = ?", [level_number]);
    if (users[0].count > 0) {
      return res.status(400).json({
        error: `РќРµРІРѕР·РјРѕР¶РЅРѕ СѓРґР°Р»РёС‚СЊ СѓСЂРѕРІРµРЅСЊ. Р•СЃС‚СЊ ${users[0].count} РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ СЃ СЌС‚РёРј СѓСЂРѕРІРЅРµРј. РџРµСЂРµРІРµРґРёС‚Рµ РёС… РЅР° РґСЂСѓРіРѕР№ СѓСЂРѕРІРµРЅСЊ СЃРЅР°С‡Р°Р»Р°.`,
      });
    }

    await pool.query("DELETE FROM gamification_levels WHERE level_number = ?", [level_number]);

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ
    await createLog(req.user.id, "DELETE", `РЈРґР°Р»РµРЅ СѓСЂРѕРІРµРЅСЊ: ${level.name} (${level_number})`, "level", level_number, req);

    res.status(204).send();
  } catch (error) {
    console.error("Delete level error:", error);
    next(error);
  }
};

/**
 * РџРµСЂРµСЃС‡РёС‚Р°С‚СЊ СѓСЂРѕРІРЅРё РІСЃРµС… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№
 */
exports.recalculateLevels = async (req, res, next) => {
  let connection;
  try {
    // РџРѕР»СѓС‡РёС‚СЊ РІСЃРµ СѓСЂРѕРІРЅРё РѕС‚СЃРѕСЂС‚РёСЂРѕРІР°РЅРЅС‹Рµ РїРѕ min_points
    const [levels] = await pool.query("SELECT level_number, min_points FROM gamification_levels WHERE is_active = 1 ORDER BY min_points DESC");

    if (levels.length === 0) {
      return res.status(400).json({ error: "РќРµС‚ Р°РєС‚РёРІРЅС‹С… СѓСЂРѕРІРЅРµР№" });
    }

    // РџРѕР»СѓС‡РёС‚СЊ РІСЃРµС… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ СЃ РёС… РѕС‡РєР°РјРё
    const [users] = await pool.query("SELECT id, points FROM users");

    connection = await pool.getConnection();
    await connection.beginTransaction();

    let updatedCount = 0;

    for (const user of users) {
      // РќР°Р№С‚Рё РїРѕРґС…РѕРґСЏС‰РёР№ СѓСЂРѕРІРµРЅСЊ РґР»СЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
      let userLevel = levels[levels.length - 1].level_number; // РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ СЃР°РјС‹Р№ РЅРёР·РєРёР№ СѓСЂРѕРІРµРЅСЊ

      for (const level of levels) {
        if (user.points >= level.min_points) {
          userLevel = level.level_number;
          break;
        }
      }

      // РћР±РЅРѕРІРёС‚СЊ СѓСЂРѕРІРµРЅСЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РµСЃР»Рё РёР·РјРµРЅРёР»СЃСЏ
      await connection.query("UPDATE users SET level = ? WHERE id = ?", [userLevel, user.id]);
      updatedCount++;
    }

    await connection.commit();

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ
    if (req.user && req.user.id) {
      await createLog(req.user.id, "UPDATE", `РџРµСЂРµСЃС‡РёС‚Р°РЅС‹ СѓСЂРѕРІРЅРё РґР»СЏ ${updatedCount} РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№`, "level", null, req);
    }

    res.json({
      message: `РЈСЂРѕРІРЅРё РїРµСЂРµСЃС‡РёС‚Р°РЅС‹ РґР»СЏ ${updatedCount} РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№`,
      updatedCount,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Recalculate levels error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "РћС€РёР±РєР° РїСЂРё РїРµСЂРµСЃС‡С‘С‚Рµ СѓСЂРѕРІРЅРµР№",
      details: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * РџРѕР»СѓС‡РёС‚СЊ СЃС‚Р°С‚РёСЃС‚РёРєСѓ РїРѕ СѓСЂРѕРІРЅСЏРј
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


