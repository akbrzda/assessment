/**
 * Валидация дат
 */

/**
 * Получить количество дней в месяце
 * @param {number} month - месяц (1-12)
 * @param {number} year - год
 * @returns {number} количество дней
 */
export function getDaysInMonth(month, year) {
  if (month === 2) {
    // Февраль
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeapYear ? 29 : 28;
  }
  // Месяцы с 30 днями: апрель, июнь, сентябрь, ноябрь
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  // Остальные месяцы имеют 31 день
  return 31;
}

/**
 * Валидация даты в формате YYYY-MM-DD
 * @param {string} dateString - дата в формате YYYY-MM-DD
 * @returns {object} { isValid: boolean, error: string | null }
 */
export function validateDate(dateString) {
  if (!dateString) {
    return { isValid: false, error: "Дата обязательна" };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return { isValid: false, error: "Неверный формат даты (используйте YYYY-MM-DD)" };
  }

  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Валидация года
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear + 100) {
    return { isValid: false, error: `Год должен быть между 1900 и ${currentYear + 100}` };
  }

  // Валидация месяца
  if (month < 1 || month > 12) {
    return { isValid: false, error: "Месяц должен быть от 1 до 12" };
  }

  // Валидация дня
  const maxDays = getDaysInMonth(month, year);
  if (day < 1 || day > maxDays) {
    return { isValid: false, error: `День должен быть от 1 до ${maxDays}` };
  }

  // Проверка, что дата корректна
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { isValid: false, error: "Некорректная дата" };
  }

  return { isValid: true, error: null };
}

/**
 * Валидация диапазона дат
 * @param {string} startDate - начальная дата (YYYY-MM-DD)
 * @param {string} endDate - конечная дата (YYYY-MM-DD)
 * @returns {object} { isValid: boolean, error: string | null }
 */
export function validateDateRange(startDate, endDate) {
  // Сначала валидируем обе даты
  const startValidation = validateDate(startDate);
  if (!startValidation.isValid) {
    return startValidation;
  }

  const endValidation = validateDate(endDate);
  if (!endValidation.isValid) {
    return endValidation;
  }

  // Проверяем, что конечная дата позже начальной
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return { isValid: false, error: "Дата окончания должна быть позже даты начала" };
  }

  return { isValid: true, error: null };
}

/**
 * Преобразовать дату в формат с временем 00:00
 * @param {string} dateString - дата в формате YYYY-MM-DD
 * @returns {string} ISO строка с временем 00:00
 */
export function dateToISOWithMidnight(dateString) {
  if (!dateString) return null;
  return `${dateString}T00:00:00`;
}

/**
 * Получить текущую дату в формате YYYY-MM-DD
 * @returns {string} текущая дата
 */
export function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Добавить дни к дате
 * @param {string} dateString - дата в формате YYYY-MM-DD
 * @param {number} days - количество дней
 * @returns {string} новая дата в формате YYYY-MM-DD
 */
export function addDaysToDate(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
