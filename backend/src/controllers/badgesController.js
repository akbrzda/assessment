const { pool } = require("../config/database");
const { sendTelegramLog } = require("../services/telegramLogger");
const { createLog } = require("./adminLogsController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Настройка загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/badges");
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
    cb(new Error("Только изображения разрешены (jpeg, jpg, png, gif, svg)"));
  },
}).single("icon");

/**
 * Получить все бейджи
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
 * Получить бейдж по ID
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
      return res.status(404).json({ error: "Бейдж не найден" });
    }

    res.json({ badge: badges[0] });
  } catch (error) {
    console.error("Get badge by id error:", error);
    next(error);
  }
};

/**
 * Создать новый бейдж
 */
exports.createBadge = async (req, res, next) => {
  try {
    const { code, name, description, icon, color, condition_type, condition_data, points_reward, is_active, sort_order } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: "Код и название обязательны" });
    }

    // Проверить уникальность кода
    const [existing] = await pool.query("SELECT id FROM badges WHERE code = ?", [code]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Бейдж с таким кодом уже существует" });
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

    // Логирование
    await createLog(req.user.id, "CREATE", `Создан бейдж: ${name} (${code})`, "badge", result.insertId, req);

    await sendTelegramLog(
      `🏅 <b>Создан новый бейдж</b>\n` +
        `Название: ${name}\n` +
        `Код: ${code}\n` +
        `Очков за бейдж: ${points_reward || 0}\n` +
        `Создал: ${req.user.id}`
    );

    res.status(201).json({ message: "Бейдж создан успешно", badgeId: result.insertId });
  } catch (error) {
    console.error("Create badge error:", error);
    next(error);
  }
};

/**
 * Обновить бейдж
 */
exports.updateBadge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, condition_type, condition_data, points_reward, is_active, sort_order } = req.body;

    // Проверить существование
    const [existing] = await pool.query("SELECT id, name FROM badges WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Бейдж не найден" });
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

    // Логирование
    await createLog(req.user.id, "UPDATE", `Обновлен бейдж: ${name} (ID: ${id})`, "badge", id, req);

    res.json({ message: "Бейдж обновлен успешно" });
  } catch (error) {
    console.error("Update badge error:", error);
    next(error);
  }
};

/**
 * Загрузить иконку для бейджа
 */
exports.uploadBadgeIcon = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Файл не загружен" });
    }

    try {
      const { id } = req.params;

      // Проверить существование бейджа
      const [badges] = await pool.query("SELECT id, icon_url FROM badges WHERE id = ?", [id]);
      if (badges.length === 0) {
        // Удалить загруженный файл
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Бейдж не найден" });
      }

      // Удалить старую иконку если есть
      if (badges[0].icon_url) {
        const oldPath = path.join(__dirname, "../../uploads/badges", path.basename(badges[0].icon_url));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const iconUrl = `/uploads/badges/${req.file.filename}`;

      // Обновить URL иконки
      await pool.query("UPDATE badges SET icon_url = ? WHERE id = ?", [iconUrl, id]);

      // Логирование
      await createLog(req.user.id, "UPDATE", `Загружена иконка для бейджа ID: ${id}`, "badge", id, req);

      res.json({ message: "Иконка загружена успешно", iconUrl });
    } catch (error) {
      // Удалить загруженный файл в случае ошибки
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      console.error("Upload badge icon error:", error);
      next(error);
    }
  });
};

/**
 * Удалить бейдж
 */
exports.deleteBadge = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Проверить существование
    const [badges] = await pool.query("SELECT id, name, icon_url FROM badges WHERE id = ?", [id]);
    if (badges.length === 0) {
      return res.status(404).json({ error: "Бейдж не найден" });
    }

    const badge = badges[0];

    // Удалить иконку если есть
    if (badge.icon_url) {
      const iconPath = path.join(__dirname, "../../uploads/badges", path.basename(badge.icon_url));
      if (fs.existsSync(iconPath)) {
        fs.unlinkSync(iconPath);
      }
    }

    // Удалить бейдж
    await pool.query("DELETE FROM badges WHERE id = ?", [id]);

    // Логирование
    await createLog(req.user.id, "DELETE", `Удален бейдж: ${badge.name} (ID: ${id})`, "badge", id, req);

    await sendTelegramLog(`🗑️ <b>Удален бейдж</b>\n` + `Название: ${badge.name}\n` + `ID: ${id}\n` + `Удалил: ${req.user.id}`);

    res.status(204).send();
  } catch (error) {
    console.error("Delete badge error:", error);
    next(error);
  }
};

/**
 * Изменить порядок сортировки бейджей
 */
exports.reorderBadges = async (req, res, next) => {
  try {
    const { badges } = req.body;

    if (!Array.isArray(badges)) {
      return res.status(400).json({ error: "Требуется массив бейджей" });
    }

    // Обновить порядок каждого бейджа
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

    // Логирование
    await createLog(req.user.id, "UPDATE", `Изменен порядок бейджей`, "badge", null, req);

    res.json({ message: "Порядок бейджей обновлен" });
  } catch (error) {
    console.error("Reorder badges error:", error);
    next(error);
  }
};
