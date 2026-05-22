const { pool } = require("../../../config/database");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");
const settingsService = require("../../../services/settingsService");
const {
  FEATURE_FLAGS_SETTING_KEY,
  FEATURE_MODULES,
  ADMIN_LINKED_MODULE_CODES,
  CLIENT_MODULE_CODES,
  LOCKED_MODULE_CODES,
} = require("../../../config/featureFlags");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

function parseDisabledModules(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);
  } catch (error) {
    console.error("Некорректный JSON feature flags:", error);
    return [];
  }
}

function getFeatureModulesPayload(disabledModules) {
  const disabledSet = new Set(disabledModules);
  return FEATURE_MODULES.map((moduleItem) => ({
    code: moduleItem.code,
    name: moduleItem.name,
    locked: Boolean(moduleItem.locked),
    enabled: !disabledSet.has(moduleItem.code),
  }));
}

function getFeatureGroupsPayload() {
  return {
    adminLinkedModuleCodes: [...ADMIN_LINKED_MODULE_CODES],
    clientModuleCodes: [...CLIENT_MODULE_CODES],
  };
}

// Хранилище логотипа
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../../../../uploads/logo");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, "logo" + path.extname(file.originalname).toLowerCase());
  },
});

const uploadLogoMiddleware = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Допустимые форматы: jpg, png, webp"));
    }
  },
}).single("logo");

/**
 * POST /admin/settings/upload-logo
 * Загружает логотип и сохраняет путь в system_settings.COMPANY_LOGO_URL
 */
exports.uploadLogo = (req, res, next) => {
  uploadLogoMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Файл не передан" });
    }

    const logoUrl = `/uploads/logo/${req.file.filename}`;

    try {
      // Создаём или обновляем настройку
      const [existing] = await pool.query("SELECT setting_key FROM system_settings WHERE setting_key = 'COMPANY_LOGO_URL'");
      if (existing.length > 0) {
        await pool.query("UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'COMPANY_LOGO_URL'", [logoUrl]);
      } else {
        await pool.query(
          "INSERT INTO system_settings (setting_key, setting_value, description) VALUES ('COMPANY_LOGO_URL', ?, 'Логотип компании для сертификатов')",
          [logoUrl],
        );
      }

      settingsService.clearCache();

      res.json({ url: logoUrl });
    } catch (dbErr) {
      next(dbErr);
    }
  });
};

/**
 * Получить все настройки
 */
exports.getSettings = async (req, res, next) => {
  try {
    const [settings] = await pool.query("SELECT setting_key, setting_value, description, updated_at FROM system_settings ORDER BY setting_key");

    // Преобразовать в объект для удобства
    const settingsObject = {};
    settings.forEach((setting) => {
      settingsObject[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description,
        updated_at: setting.updated_at,
      };
    });

    res.json({ settings: settingsObject, settingsList: settings });
  } catch (error) {
    console.error("Get settings error:", error);
    next(error);
  }
};

/**
 * Получить feature flags модулей
 */
exports.getFeatureFlags = async (req, res, next) => {
  try {
    const rawValue = await settingsService.getSetting(FEATURE_FLAGS_SETTING_KEY, "[]");
    const disabledModules = parseDisabledModules(rawValue);

    res.json({
      disabledModules,
      modules: getFeatureModulesPayload(disabledModules),
      groups: getFeatureGroupsPayload(),
    });
  } catch (error) {
    console.error("Get feature flags error:", error);
    next(error);
  }
};

/**
 * Получить конкретную настройку
 */
exports.getSettingByKey = async (req, res, next) => {
  try {
    const { key } = req.params;

    const [settings] = await pool.query("SELECT setting_key, setting_value, description, updated_at FROM system_settings WHERE setting_key = ?", [
      key,
    ]);

    if (settings.length === 0) {
      return res.status(404).json({ error: "Настройка не найдена" });
    }

    res.json({ setting: settings[0] });
  } catch (error) {
    console.error("Get setting by key error:", error);
    next(error);
  }
};

/**
 * Обновить настройку
 */
exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: "Значение настройки обязательно" });
    }

    // Проверить существование настройки
    const [existing] = await pool.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ?", [key]);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Настройка не найдена" });
    }

    const oldValue = existing[0].setting_value;

    // Обновить настройку
    await pool.query("UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?", [value.toString(), key]);

    // Сбросить кэш настроек
    settingsService.clearCache();

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "setting.updated",
      entity: "setting",
      entityId: null,
      metadata: {
        key,
        previousValue: oldValue,
        value,
      },
    });

    res.json({ message: "Настройка обновлена успешно" });
  } catch (error) {
    console.error("Update setting error:", error);
    next(error);
  }
};

/**
 * Обновить feature flags модулей
 */
exports.updateFeatureFlags = async (req, res, next) => {
  try {
    const input = Array.isArray(req.body?.disabledModules) ? req.body.disabledModules : null;
    if (!input) {
      return res.status(400).json({ error: "Поле disabledModules должно быть массивом" });
    }

    const knownCodes = new Set(FEATURE_MODULES.map((item) => item.code));
    const normalized = Array.from(new Set(input.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)));

    const invalidCodes = normalized.filter((code) => !knownCodes.has(code));
    if (invalidCodes.length > 0) {
      return res.status(400).json({ error: "Переданы неизвестные модули", details: { invalidCodes } });
    }

    const lockedInPayload = normalized.filter((code) => LOCKED_MODULE_CODES.has(code));
    if (lockedInPayload.length > 0) {
      return res.status(400).json({ error: "Нельзя отключать защищённые модули", details: { lockedInPayload } });
    }

    const serialized = JSON.stringify(normalized);
    const [existing] = await pool.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ?", [FEATURE_FLAGS_SETTING_KEY]);

    if (existing.length > 0) {
      await pool.query("UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?", [serialized, FEATURE_FLAGS_SETTING_KEY]);
    } else {
      await pool.query("INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)", [
        FEATURE_FLAGS_SETTING_KEY,
        serialized,
        "Отключённые модули проекта для feature flags",
      ]);
    }

    settingsService.clearCache();

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "feature_flags.updated",
      entity: "setting",
      entityId: null,
      metadata: {
        key: FEATURE_FLAGS_SETTING_KEY,
        disabledModules: normalized,
      },
    });

    res.json({
      message: "Feature flags обновлены успешно",
      disabledModules: normalized,
      modules: getFeatureModulesPayload(normalized),
      groups: getFeatureGroupsPayload(),
    });
  } catch (error) {
    console.error("Update feature flags error:", error);
    next(error);
  }
};

/**
 * Создать новую настройку
 */
exports.createSetting = async (req, res, next) => {
  try {
    const { key, value, description } = req.body;

    if (!key || !key.trim()) {
      return res.status(400).json({ error: "Ключ настройки обязателен" });
    }

    if (value === undefined || value === null) {
      return res.status(400).json({ error: "Значение настройки обязательно" });
    }

    // Проверить уникальность ключа
    const [existing] = await pool.query("SELECT setting_key FROM system_settings WHERE setting_key = ?", [key.trim()]);

    if (existing.length > 0) {
      return res.status(400).json({ error: "Настройка с таким ключом уже существует" });
    }

    await pool.query("INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)", [
      key.trim(),
      value.toString(),
      description || null,
    ]);

    // Сбросить кэш настроек
    settingsService.clearCache();

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "setting.created",
      entity: "setting",
      entityId: null,
      metadata: {
        key: key.trim(),
        value,
      },
    });

    res.status(201).json({ message: "Настройка создана успешно" });
  } catch (error) {
    console.error("Create setting error:", error);
    next(error);
  }
};

/**
 * Удалить настройку
 */
exports.deleteSetting = async (req, res, next) => {
  try {
    const { key } = req.params;

    // Проверить существование
    const [existing] = await pool.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ?", [key]);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Настройка не найдена" });
    }

    await pool.query("DELETE FROM system_settings WHERE setting_key = ?", [key]);

    // Сбросить кэш настроек
    settingsService.clearCache();

    await logAndSend({
      req,
      actor: buildActorFromRequest(req),
      action: "setting.deleted",
      entity: "setting",
      entityId: null,
      metadata: {
        key,
        value: existing[0].setting_value,
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Delete setting error:", error);
    next(error);
  }
};
