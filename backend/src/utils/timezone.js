const moment = require("moment-timezone");

/**
 * Конвертирует дату из UTC в часовой пояс пользователя
 * @param {Date|string} utcDate - Дата в UTC
 * @param {string} timezone - Часовой пояс пользователя (например, 'Asia/Tashkent')
 * @returns {string} - ISO строка даты в часовом поясе пользователя
 */
function convertToUserTimezone(utcDate, timezone = "UTC") {
  if (!utcDate) return null;

  try {
    return moment.utc(utcDate).tz(timezone).format();
  } catch (error) {
    console.error("Ошибка конвертации даты:", error);
    return utcDate;
  }
}

/**
 * Конвертирует дату из часового пояса пользователя в UTC
 * @param {Date|string} localDate - Дата в часовом поясе пользователя
 * @param {string} timezone - Часовой пояс пользователя (например, 'Asia/Tashkent')
 * @returns {Date} - Дата в UTC
 */
function convertToUTC(localDate, timezone = "UTC") {
  if (!localDate) return null;

  try {
    return moment.tz(localDate, timezone).utc().toDate();
  } catch (error) {
    console.error("Ошибка конвертации даты в UTC:", error);
    return localDate;
  }
}

/**
 * Конвертирует объект с датами в часовой пояс пользователя
 * @param {Object} obj - Объект с данными
 * @param {Array<string>} dateFields - Массив полей с датами для конвертации
 * @param {string} timezone - Часовой пояс пользователя
 * @returns {Object} - Объект с конвертированными датами
 */
function convertObjectDates(obj, dateFields, timezone = "UTC") {
  if (!obj || timezone === "UTC") return obj;

  const converted = { ...obj };

  for (const field of dateFields) {
    if (converted[field]) {
      converted[field] = convertToUserTimezone(converted[field], timezone);
    }
  }

  return converted;
}

/**
 * Конвертирует массив объектов с датами в часовой пояс пользователя
 * @param {Array<Object>} array - Массив объектов
 * @param {Array<string>} dateFields - Массив полей с датами для конвертации
 * @param {string} timezone - Часовой пояс пользователя
 * @returns {Array<Object>} - Массив с конвертированными датами
 */
function convertArrayDates(array, dateFields, timezone = "UTC") {
  if (!array || !Array.isArray(array) || timezone === "UTC") return array;

  return array.map((obj) => convertObjectDates(obj, dateFields, timezone));
}

/**
 * Получает смещение часового пояса в минутах
 * @param {string} timezone - Часовой пояс
 * @returns {number} - Смещение в минутах
 */
function getTimezoneOffset(timezone = "UTC") {
  try {
    return moment.tz(timezone).utcOffset();
  } catch (error) {
    console.error("Ошибка получения смещения часового пояса:", error);
    return 0;
  }
}

/**
 * Валидирует часовой пояс
 * @param {string} timezone - Часовой пояс для проверки
 * @returns {boolean} - true если часовой пояс валиден
 */
function isValidTimezone(timezone) {
  return moment.tz.zone(timezone) !== null;
}

module.exports = {
  convertToUserTimezone,
  convertToUTC,
  convertObjectDates,
  convertArrayDates,
  getTimezoneOffset,
  isValidTimezone,
};
