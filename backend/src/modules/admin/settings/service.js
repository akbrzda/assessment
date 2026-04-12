const { pool } = require("../../../config/database");
const { logAndSend, buildActorFromRequest } = require("../../../services/auditService");
const settingsService = require("../../../services/settingsService");

/**
 * РџРѕР»СѓС‡РёС‚СЊ РІСЃРµ РЅР°СЃС‚СЂРѕР№РєРё
 */
exports.getSettings = async (req, res, next) => {
  try {
    const [settings] = await pool.query("SELECT setting_key, setting_value, description, updated_at FROM system_settings ORDER BY setting_key");

    // РџСЂРµРѕР±СЂР°Р·РѕРІР°С‚СЊ РІ РѕР±СЉРµРєС‚ РґР»СЏ СѓРґРѕР±СЃС‚РІР°
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
 * РџРѕР»СѓС‡РёС‚СЊ РєРѕРЅРєСЂРµС‚РЅСѓСЋ РЅР°СЃС‚СЂРѕР№РєСѓ
 */
exports.getSettingByKey = async (req, res, next) => {
  try {
    const { key } = req.params;

    const [settings] = await pool.query("SELECT setting_key, setting_value, description, updated_at FROM system_settings WHERE setting_key = ?", [
      key,
    ]);

    if (settings.length === 0) {
      return res.status(404).json({ error: "РќР°СЃС‚СЂРѕР№РєР° РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    res.json({ setting: settings[0] });
  } catch (error) {
    console.error("Get setting by key error:", error);
    next(error);
  }
};

/**
 * РћР±РЅРѕРІРёС‚СЊ РЅР°СЃС‚СЂРѕР№РєСѓ
 */
exports.updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: "Р—РЅР°С‡РµРЅРёРµ РЅР°СЃС‚СЂРѕР№РєРё РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ" });
    }

    // РџСЂРѕРІРµСЂРёС‚СЊ СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ РЅР°СЃС‚СЂРѕР№РєРё
    const [existing] = await pool.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ?", [key]);

    if (existing.length === 0) {
      return res.status(404).json({ error: "РќР°СЃС‚СЂРѕР№РєР° РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    const oldValue = existing[0].setting_value;

    // РћР±РЅРѕРІРёС‚СЊ РЅР°СЃС‚СЂРѕР№РєСѓ
    await pool.query("UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?", [value.toString(), key]);

    // РЎР±СЂРѕСЃРёС‚СЊ РєСЌС€ РЅР°СЃС‚СЂРѕРµРє
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

    res.json({ message: "РќР°СЃС‚СЂРѕР№РєР° РѕР±РЅРѕРІР»РµРЅР° СѓСЃРїРµС€РЅРѕ" });
  } catch (error) {
    console.error("Update setting error:", error);
    next(error);
  }
};

/**
 * РЎРѕР·РґР°С‚СЊ РЅРѕРІСѓСЋ РЅР°СЃС‚СЂРѕР№РєСѓ
 */
exports.createSetting = async (req, res, next) => {
  try {
    const { key, value, description } = req.body;

    if (!key || !key.trim()) {
      return res.status(400).json({ error: "РљР»СЋС‡ РЅР°СЃС‚СЂРѕР№РєРё РѕР±СЏР·Р°С‚РµР»РµРЅ" });
    }

    if (value === undefined || value === null) {
      return res.status(400).json({ error: "Р—РЅР°С‡РµРЅРёРµ РЅР°СЃС‚СЂРѕР№РєРё РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ" });
    }

    // РџСЂРѕРІРµСЂРёС‚СЊ СѓРЅРёРєР°Р»СЊРЅРѕСЃС‚СЊ РєР»СЋС‡Р°
    const [existing] = await pool.query("SELECT setting_key FROM system_settings WHERE setting_key = ?", [key.trim()]);

    if (existing.length > 0) {
      return res.status(400).json({ error: "РќР°СЃС‚СЂРѕР№РєР° СЃ С‚Р°РєРёРј РєР»СЋС‡РѕРј СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚" });
    }

    await pool.query("INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)", [
      key.trim(),
      value.toString(),
      description || null,
    ]);

    // РЎР±СЂРѕСЃРёС‚СЊ РєСЌС€ РЅР°СЃС‚СЂРѕРµРє
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

    res.status(201).json({ message: "РќР°СЃС‚СЂРѕР№РєР° СЃРѕР·РґР°РЅР° СѓСЃРїРµС€РЅРѕ" });
  } catch (error) {
    console.error("Create setting error:", error);
    next(error);
  }
};

/**
 * РЈРґР°Р»РёС‚СЊ РЅР°СЃС‚СЂРѕР№РєСѓ
 */
exports.deleteSetting = async (req, res, next) => {
  try {
    const { key } = req.params;

    // РџСЂРѕРІРµСЂРёС‚СЊ СЃСѓС‰РµСЃС‚РІРѕРІР°РЅРёРµ
    const [existing] = await pool.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key = ?", [key]);

    if (existing.length === 0) {
      return res.status(404).json({ error: "РќР°СЃС‚СЂРѕР№РєР° РЅРµ РЅР°Р№РґРµРЅР°" });
    }

    await pool.query("DELETE FROM system_settings WHERE setting_key = ?", [key]);

    // РЎР±СЂРѕСЃРёС‚СЊ РєСЌС€ РЅР°СЃС‚СЂРѕРµРє
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

