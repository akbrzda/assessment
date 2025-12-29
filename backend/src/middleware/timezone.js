const { convertObjectDates, convertArrayDates } = require("../utils/timezone");

/**
 * Middleware для автоматической конвертации дат в часовой пояс пользователя
 * Конвертирует даты в ответах API из UTC в часовой пояс текущего пользователя
 */
function timezoneMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    const timezone = req.currentUser?.timezone || "UTC";

    if (timezone !== "UTC" && data) {
      const convertedData = convertDatesInResponse(data, timezone);
      return originalJson(convertedData);
    }

    return originalJson(data);
  };

  next();
}

/**
 * Рекурсивно конвертирует даты в объекте/массиве
 */
function convertDatesInResponse(data, timezone) {
  if (!data || typeof data !== "object") {
    return data;
  }

  // Обработка массива
  if (Array.isArray(data)) {
    return data.map((item) => convertDatesInResponse(item, timezone));
  }

  // Поля с датами для конвертации
  const dateFields = [
    "createdAt",
    "updatedAt",
    "completedAt",
    "startedAt",
    "openAt",
    "closeAt",
    "expiresAt",
    "usedAt",
    "assignedAt",
    "grantedAt",
    "answeredAt",
    "lastAttemptDate",
    "date",
    "created_at",
    "updated_at",
    "completed_at",
    "started_at",
    "open_at",
    "close_at",
    "expires_at",
    "used_at",
    "assigned_at",
    "granted_at",
    "answered_at",
    "last_attempt_date",
  ];

  const converted = {};

  for (const [key, value] of Object.entries(data)) {
    if (dateFields.includes(key) && value) {
      converted[key] = convertToUserTimezone(value, timezone);
    } else if (typeof value === "object" && value !== null) {
      converted[key] = convertDatesInResponse(value, timezone);
    } else {
      converted[key] = value;
    }
  }

  return converted;
}

/**
 * Простая конвертация даты в часовой пояс пользователя
 */
function convertToUserTimezone(utcDate, timezone) {
  if (!utcDate) return null;

  try {
    const date = new Date(utcDate);
    if (isNaN(date.getTime())) return utcDate;

    // Используем Intl.DateTimeFormat для конвертации
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const dateParts = {};

    parts.forEach(({ type, value }) => {
      dateParts[type] = value;
    });

    // Формируем ISO строку с учетом часового пояса
    return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`;
  } catch (error) {
    console.error("Ошибка конвертации даты:", error);
    return utcDate;
  }
}

module.exports = timezoneMiddleware;
