const { pool } = require("../../../../config/database");
const { createLog } = require("../../../../services/adminLogService");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// РќР°СЃС‚СЂРѕР№РєР° Р·Р°РіСЂСѓР·РєРё С„Р°Р№Р»РѕРІ
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../../../../uploads/badges");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "badge-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("РўРѕР»СЊРєРѕ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ СЂР°Р·СЂРµС€РµРЅС‹ (jpeg, jpg, png, gif, svg)"));
  },
}).single("icon");

/**
 * РџРѕР»СѓС‡РёС‚СЊ РІСЃРµ Р±РµР№РґР¶Рё
 */
exports.getBadges = async (req, res, next) => {
  try {
    const [badges] = await pool.query(
      `SELECT id, code, name, description, icon, color, icon_url, 
              condition_type, condition_data, points_reward, is_active, 
              sort_order, created_at, updated_at 
       FROM badges 
       ORDER BY sort_order ASC, id ASC`
    );

    res.json({ badges });
  } catch (error) {
    console.error("Get badges error:", error);
    next(error);
  }
};

/**
 * РџРѕР»СѓС‡РёС‚СЊ Р±РµР№РґР¶ РїРѕ ID
 */
exports.getBadgeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [badges] = await pool.query(
      `SELECT id, code, name, description, icon, color, icon_url, 
              condition_type, condition_data, points_reward, is_active, 
              sort_order, created_at, updated_at 
       FROM badges 
       WHERE id = ?`,
      [id]
    );

    if (badges.length === 0) {
      return res.status(404).json({ error: "Р‘РµР№РґР¶ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    res.json({ badge: badges[0] });
  } catch (error) {
    console.error("Get badge by id error:", error);
    next(error);
  }
};

/**
 * РЎРѕР·РґР°С‚СЊ РЅРѕРІС‹Р№ Р±РµР№РґР¶
 */
exports.createBadge = async (req, res, next) => {
  try {
    const { code, name, description, icon, color, condition_type, condition_data, points_reward, is_active, sort_order } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: "РљРѕРґ Рё РЅР°Р·РІР°РЅРёРµ РѕР±СЏР·Р°С‚РµР»СЊРЅС‹" });
    }

    // РџСЂРѕРІРµСЂРёС‚СЊ СѓРЅРёРєР°Р»СЊРЅРѕСЃС‚СЊ РєРѕРґР°
    const [existing] = await pool.query("SELECT id FROM badges WHERE code = ?", [code]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Р‘РµР№РґР¶ СЃ С‚Р°РєРёРј РєРѕРґРѕРј СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚" });
    }

    const [result] = await pool.query(
      `INSERT INTO badges (code, name, description, icon, color, condition_type, condition_data, 
                          points_reward, is_active, sort_order) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        name,
        description || null,
        icon || null,
        color || "#10B981",
        condition_type || "manual",
        condition_data ? JSON.stringify(condition_data) : null,
        points_reward || 0,
        is_active !== undefined ? is_active : 1,
        sort_order || 0,
      ]
    );

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ
    await createLog(req.user.id, "CREATE", `РЎРѕР·РґР°РЅ Р±РµР№РґР¶: ${name} (${code})`, "badge", result.insertId, req);

    res.status(201).json({ message: "Р‘РµР№РґР¶ СЃРѕР·РґР°РЅ СѓСЃРїРµС€РЅРѕ", badgeId: result.insertId });
  } catch (error) {
    console.error("Create badge error:", error);
    next(error);
  }
};

/**
 * РћР±РЅРѕРІРёС‚СЊ Р±РµР№РґР¶
 */
exports.updateBadge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, condition_type, condition_data, points_reward, is_active, sort_order } = req.body;

    // РџСЂРѕРІРµСЂРёС‚СЊ СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ
    const [existing] = await pool.query("SELECT id, name FROM badges WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Р‘РµР№РґР¶ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    await pool.query(
      `UPDATE badges 
       SET name = ?, description = ?, icon = ?, color = ?, 
           condition_type = ?, condition_data = ?, points_reward = ?, 
           is_active = ?, sort_order = ?
       WHERE id = ?`,
      [
        name,
        description || null,
        icon || null,
        color || "#10B981",
        condition_type || "manual",
        condition_data ? JSON.stringify(condition_data) : null,
        points_reward || 0,
        is_active !== undefined ? is_active : 1,
        sort_order || 0,
        id,
      ]
    );

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ
    await createLog(req.user.id, "UPDATE", `РћР±РЅРѕРІР»РµРЅ Р±РµР№РґР¶: ${name} (ID: ${id})`, "badge", id, req);

    res.json({ message: "Р‘РµР№РґР¶ РѕР±РЅРѕРІР»РµРЅ СѓСЃРїРµС€РЅРѕ" });
  } catch (error) {
    console.error("Update badge error:", error);
    next(error);
  }
};

/**
 * Р—Р°РіСЂСѓР·РёС‚СЊ РёРєРѕРЅРєСѓ РґР»СЏ Р±РµР№РґР¶Р°
 */
exports.uploadBadgeIcon = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Р¤Р°Р№Р» РЅРµ Р·Р°РіСЂСѓР¶РµРЅ" });
    }

    try {
      const { id } = req.params;

      // РџСЂРѕРІРµСЂРёС‚СЊ СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ Р±РµР№РґР¶Р°
      const [badges] = await pool.query("SELECT id, icon_url FROM badges WHERE id = ?", [id]);
      if (badges.length === 0) {
        // РЈРґР°Р»РёС‚СЊ Р·Р°РіСЂСѓР¶РµРЅРЅС‹Р№ С„Р°Р№Р»
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Р‘РµР№РґР¶ РЅРµ РЅР°Р№РґРµРЅ" });
      }

      // РЈРґР°Р»РёС‚СЊ СЃС‚Р°СЂСѓСЋ РёРєРѕРЅРєСѓ РµСЃР»Рё РµСЃС‚СЊ
      if (badges[0].icon_url) {
        const oldPath = path.join(__dirname, "../../../../../uploads/badges", path.basename(badges[0].icon_url));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const iconUrl = `/uploads/badges/${req.file.filename}`;

      // РћР±РЅРѕРІРёС‚СЊ URL РёРєРѕРЅРєРё
      await pool.query("UPDATE badges SET icon_url = ? WHERE id = ?", [iconUrl, id]);

      // Р›РѕРіРёСЂРѕРІР°РЅРёРµ
      await createLog(req.user.id, "UPDATE", `Р—Р°РіСЂСѓР¶РµРЅР° РёРєРѕРЅРєР° РґР»СЏ Р±РµР№РґР¶Р° ID: ${id}`, "badge", id, req);

      res.json({ message: "РРєРѕРЅРєР° Р·Р°РіСЂСѓР¶РµРЅР° СѓСЃРїРµС€РЅРѕ", iconUrl });
    } catch (error) {
      // РЈРґР°Р»РёС‚СЊ Р·Р°РіСЂСѓР¶РµРЅРЅС‹Р№ С„Р°Р№Р» РІ СЃР»СѓС‡Р°Рµ РѕС€РёР±РєРё
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      console.error("Upload badge icon error:", error);
      next(error);
    }
  });
};

/**
 * РЈРґР°Р»РёС‚СЊ Р±РµР№РґР¶
 */
exports.deleteBadge = async (req, res, next) => {
  try {
    const { id } = req.params;

    // РџСЂРѕРІРµСЂРёС‚СЊ СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ
    const [badges] = await pool.query("SELECT id, name, icon_url FROM badges WHERE id = ?", [id]);
    if (badges.length === 0) {
      return res.status(404).json({ error: "Р‘РµР№РґР¶ РЅРµ РЅР°Р№РґРµРЅ" });
    }

    const badge = badges[0];

    // РЈРґР°Р»РёС‚СЊ РёРєРѕРЅРєСѓ РµСЃР»Рё РµСЃС‚СЊ
    if (badge.icon_url) {
      const iconPath = path.join(__dirname, "../../../../../uploads/badges", path.basename(badge.icon_url));
      if (fs.existsSync(iconPath)) {
        fs.unlinkSync(iconPath);
      }
    }

    // РЈРґР°Р»РёС‚СЊ Р±РµР№РґР¶
    await pool.query("DELETE FROM badges WHERE id = ?", [id]);

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ
    await createLog(req.user.id, "DELETE", `РЈРґР°Р»РµРЅ Р±РµР№РґР¶: ${badge.name} (ID: ${id})`, "badge", id, req);

    res.status(204).send();
  } catch (error) {
    console.error("Delete badge error:", error);
    next(error);
  }
};

/**
 * РР·РјРµРЅРёС‚СЊ РїРѕСЂСЏРґРѕРє СЃРѕСЂС‚РёСЂРѕРІРєРё Р±РµР№РґР¶РµР№
 */
exports.reorderBadges = async (req, res, next) => {
  try {
    const { badges } = req.body;

    if (!Array.isArray(badges)) {
      return res.status(400).json({ error: "РўСЂРµР±СѓРµС‚СЃСЏ РјР°СЃСЃРёРІ Р±РµР№РґР¶РµР№" });
    }

    // РћР±РЅРѕРІРёС‚СЊ РїРѕСЂСЏРґРѕРє РєР°Р¶РґРѕРіРѕ Р±РµР№РґР¶Р°
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (let i = 0; i < badges.length; i++) {
        await connection.query("UPDATE badges SET sort_order = ? WHERE id = ?", [i, badges[i].id]);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // Р›РѕРіРёСЂРѕРІР°РЅРёРµ
    await createLog(req.user.id, "UPDATE", `РР·РјРµРЅРµРЅ РїРѕСЂСЏРґРѕРє Р±РµР№РґР¶РµР№`, "badge", null, req);

    res.json({ message: "РџРѕСЂСЏРґРѕРє Р±РµР№РґР¶РµР№ РѕР±РЅРѕРІР»РµРЅ" });
  } catch (error) {
    console.error("Reorder badges error:", error);
    next(error);
  }
};



