/**
 * Форматирует дату в читаемый формат
 * @param {string|Date} date - Дата для форматирования
 * @param {boolean} includeTime - Включать ли время
 * @returns {string} - Отформатированная дата
 */
export function formatDate(date, includeTime = true) {
  if (!date) return "";

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return String(date);

    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };

    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }

    return dateObj.toLocaleString("ru-RU", options);
  } catch (error) {
    console.error("Ошибка форматирования даты:", error);
    return String(date);
  }
}

/**
 * Форматирует относительное время (например, "5 минут назад")
 * @param {string|Date} date - Дата для форматирования
 * @returns {string} - Относительное время
 */
export function formatRelativeTime(date) {
  if (!date) return "";

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return String(date);

    const now = new Date();
    const diffMs = now - dateObj;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return "только что";
    } else if (diffMin < 60) {
      return `${diffMin} ${getMinuteWord(diffMin)} назад`;
    } else if (diffHour < 24) {
      return `${diffHour} ${getHourWord(diffHour)} назад`;
    } else if (diffDay < 7) {
      return `${diffDay} ${getDayWord(diffDay)} назад`;
    } else {
      return formatDate(date);
    }
  } catch (error) {
    console.error("Ошибка форматирования относительного времени:", error);
    return String(date);
  }
}

function getMinuteWord(num) {
  if (num % 10 === 1 && num % 100 !== 11) return "минуту";
  if ([2, 3, 4].includes(num % 10) && ![12, 13, 14].includes(num % 100)) return "минуты";
  return "минут";
}

function getHourWord(num) {
  if (num % 10 === 1 && num % 100 !== 11) return "час";
  if ([2, 3, 4].includes(num % 10) && ![12, 13, 14].includes(num % 100)) return "часа";
  return "часов";
}

function getDayWord(num) {
  if (num % 10 === 1 && num % 100 !== 11) return "день";
  if ([2, 3, 4].includes(num % 10) && ![12, 13, 14].includes(num % 100)) return "дня";
  return "дней";
}

/**
 * Конвертирует дату в ISO строку для отправки на сервер
 * @param {Date} date - Дата для конвертации
 * @returns {string} - ISO строка
 */
export function toISOString(date) {
  if (!date) return null;

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return null;

    return dateObj.toISOString();
  } catch (error) {
    console.error("Ошибка конвертации в ISO:", error);
    return null;
  }
}

/**
 * Форматирует дату в YYYY-MM-DD в локальном часовом поясе браузера
 * @param {string|Date} date
 * @returns {string}
 */
export function toLocalDateInputValue(date) {
  if (!date) return "";
  const dateObj = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dateObj.getTime())) return "";

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Форматирует дату/время в YYYY-MM-DDTHH:mm в локальном часовом поясе браузера
 * @param {string|Date} date
 * @returns {string}
 */
export function toLocalDateTimeInputValue(date) {
  if (!date) return "";
  const dateObj = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dateObj.getTime())) return "";

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
