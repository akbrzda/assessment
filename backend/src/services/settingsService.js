const { pool } = require("../config/database");

/**
 * Кэш настроек для быстрого доступа
 */
let settingsCache = null;
let lastCacheUpdate = null;
const CACHE_TTL = 60000; // 1 минута

/**
 * Загрузить все настройки из БД
 */
async function loadSettings() {
  const now = Date.now();

  // Если кэш актуален, возвращаем его
  if (settingsCache && lastCacheUpdate && now - lastCacheUpdate < CACHE_TTL) {
    return settingsCache;
  }

  try {
    const [rows] = await pool.query("SELECT setting_key, setting_value FROM system_settings");

    settingsCache = {};
    rows.forEach((row) => {
      settingsCache[row.setting_key] = row.setting_value;
    });

    lastCacheUpdate = now;
    return settingsCache;
  } catch (error) {
    console.error("Ошибка загрузки настроек:", error);
    return {};
  }
}

/**
 * Получить значение настройки
 * @param {string} key - Ключ настройки
 * @param {any} defaultValue - Значение по умолчанию, если настройка не найдена
 */
async function getSetting(key, defaultValue = null) {
  const settings = await loadSettings();
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

/**
 * Сбросить кэш настроек (вызывать после изменения настроек)
 */
function clearCache() {
  settingsCache = null;
  lastCacheUpdate = null;
}

module.exports = {
  loadSettings,
  getSetting,
  clearCache,
};
