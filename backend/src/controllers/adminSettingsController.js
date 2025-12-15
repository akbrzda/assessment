const { pool } = require("../config/database");
const { logAndSend, buildActorFromRequest } = require("../services/auditService");
const settingsService = require("../services/settingsService");

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
