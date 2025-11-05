/**
 * ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ ВАЛИДАЦИИ ДАТ
 *
 * Этот файл показывает все примеры валидации дат
 * для помощи в разработке новых компонентов
 */

import { validateDate, validateDateRange, dateToISOWithMidnight, getTodayString, addDaysToDate, getDaysInMonth } from "./dateValidation.js";

// ==================== ПРИМЕР 1: Базовая валидация одной даты ====================

console.log("=== ПРИМЕР 1: Валидация одной даты ===");

// Корректная дата
const validDate = validateDate("2025-10-27");
console.log("Дата 2025-10-27:", validDate);
// Output: { isValid: true, error: null }

// Некорректный месяц
const invalidMonth = validateDate("2025-13-01");
console.log("Дата 2025-13-01:", invalidMonth);
// Output: { isValid: false, error: 'Месяц должен быть от 1 до 12' }

// Некорректный день (февраль)
const invalidDay = validateDate("2025-02-30");
console.log("Дата 2025-02-30:", invalidDay);
// Output: { isValid: false, error: 'День должен быть от 1 до 28' }

// Пустая дата
const emptyDate = validateDate("");
console.log("Пустая дата:", emptyDate);
// Output: { isValid: false, error: 'Дата обязательна' }

// Неверный формат
const invalidFormat = validateDate("27-10-2025");
console.log("Формат 27-10-2025:", invalidFormat);
// Output: { isValid: false, error: 'Неверный формат даты (используйте YYYY-MM-DD)' }

// ==================== ПРИМЕР 2: Валидация диапазона дат ====================

console.log("\n=== ПРИМЕР 2: Валидация диапазона дат ===");

// Корректный диапазон
const validRange = validateDateRange("2025-10-01", "2025-10-31");
console.log("Диапазон 2025-10-01 → 2025-10-31:", validRange);
// Output: { isValid: true, error: null }

// Неверный диапазон (конец раньше начала)
const invalidRange = validateDateRange("2025-10-31", "2025-10-01");
console.log("Диапазон 2025-10-31 → 2025-10-01:", invalidRange);
// Output: { isValid: false, error: 'Дата окончания должна быть позже даты начала' }

// Одна и та же дата
const sameDate = validateDateRange("2025-10-27", "2025-10-27");
console.log("Диапазон 2025-10-27 → 2025-10-27:", sameDate);
// Output: { isValid: false, error: 'Дата окончания должна быть позже даты начала' }

// ==================== ПРИМЕР 3: Преобразование дат ====================

console.log("\n=== ПРИМЕР 3: Преобразование дат ===");

// Дата в ISO формат с 00:00
const isoDate = dateToISOWithMidnight("2025-10-27");
console.log("Преобразование 2025-10-27:", isoDate);
// Output: '2025-10-27T00:00:00'

// Пустая дата
const emptyIso = dateToISOWithMidnight("");
console.log("Преобразование пустой даты:", emptyIso);
// Output: null

// ==================== ПРИМЕР 4: Работа с текущей датой ====================

console.log("\n=== ПРИМЕР 4: Работа с текущей датой ===");

// Получить сегодняшнюю дату
const today = getTodayString();
console.log("Сегодняшняя дата:", today);
// Output: '2025-10-27' (зависит от текущей даты)

// ==================== ПРИМЕР 5: Добавление дней к дате ====================

console.log("\n=== ПРИМЕР 5: Добавление дней к дате ===");

// Добавить 7 дней
const dateIn7Days = addDaysToDate("2025-10-27", 7);
console.log("2025-10-27 + 7 дней:", dateIn7Days);
// Output: '2025-11-03'

// Добавить 30 дней
const dateIn30Days = addDaysToDate("2025-10-27", 30);
console.log("2025-10-27 + 30 дней:", dateIn30Days);
// Output: '2025-11-26'

// Вычесть дни (отрицательное число)
const dateIn3DaysAgo = addDaysToDate("2025-10-27", -3);
console.log("2025-10-27 - 3 дня:", dateIn3DaysAgo);
// Output: '2025-10-24'

// ==================== ПРИМЕР 6: Получить дни в месяце ====================

console.log("\n=== ПРИМЕР 6: Дни в месяце ===");

// Январь (31 день)
console.log("Дней в январе 2025:", getDaysInMonth(1, 2025));
// Output: 31

// Февраль (28 дней в невисокосный год)
console.log("Дней в феврале 2025:", getDaysInMonth(2, 2025));
// Output: 28

// Февраль (29 дней в високосный год)
console.log("Дней в феврале 2024:", getDaysInMonth(2, 2024));
// Output: 29

// Апрель (30 дней)
console.log("Дней в апреле 2025:", getDaysInMonth(4, 2025));
// Output: 30

// ==================== ПРИМЕР 7: Использование в компоненте ====================

console.log("\n=== ПРИМЕР 7: Использование в компоненте ===");

// Это пример того, как использовать валидацию в Vue компоненте

const exampleComponent = {
  data() {
    return {
      formData: {
        openAt: "",
        closeAt: "",
      },
      errors: {},
    };
  },
  methods: {
    validateDateField(fieldName) {
      const value = this.formData[fieldName];

      // Валидация одной даты
      const validation = validateDate(value);
      if (!validation.isValid) {
        this.errors[fieldName] = validation.error;
        return;
      }

      // Валидация диапазона (если это поле closeAt)
      if (fieldName === "closeAt" && this.formData.openAt) {
        const rangeValidation = validateDateRange(this.formData.openAt, this.formData.closeAt);
        if (!rangeValidation.isValid) {
          this.errors[fieldName] = rangeValidation.error;
          return;
        }
      }

      // Если нет ошибок, удаляем ошибку
      delete this.errors[fieldName];
    },

    async submitForm() {
      // Валидируем обе даты перед отправкой
      this.validateDateField("openAt");
      this.validateDateField("closeAt");

      // Проверяем есть ли ошибки
      if (Object.keys(this.errors).length > 0) {
        console.log("Есть ошибки в форме:", this.errors);
        return;
      }

      // Преобразуем даты в ISO формат с 00:00
      const data = {
        ...this.formData,
        openAt: dateToISOWithMidnight(this.formData.openAt),
        closeAt: dateToISOWithMidnight(this.formData.closeAt),
      };

      console.log("Отправляем на backend:", data);
      // Output: {
      //   openAt: '2025-10-27T00:00:00',
      //   closeAt: '2025-11-10T00:00:00',
      // }
    },
  },
};

// ==================== ПРИМЕР 8: Тест-кейсы валидации ====================

console.log("\n=== ПРИМЕР 8: Тест-кейсы ===");

const testCases = [
  // Корректные даты
  { date: "2025-01-15", expectedValid: true },
  { date: "2025-02-28", expectedValid: true },
  { date: "2024-02-29", expectedValid: true }, // Високосный год
  { date: "2025-12-31", expectedValid: true },

  // Некорректные даты
  { date: "2025-00-01", expectedValid: false }, // Месяц 0
  { date: "2025-13-01", expectedValid: false }, // Месяц 13
  { date: "2025-02-30", expectedValid: false }, // День > дней в месяце
  { date: "2025-04-31", expectedValid: false }, // День > дней в месяце
  { date: "2025-01-32", expectedValid: false }, // День 32
  { date: "1800-01-01", expectedValid: false }, // Год < 1900
  { date: "2226-01-01", expectedValid: false }, // Год > текущий + 100
];

testCases.forEach((testCase) => {
  const result = validateDate(testCase.date);
  const passed = result.isValid === testCase.expectedValid ? "✓" : "✗";
  console.log(`${passed} ${testCase.date}: ${result.isValid ? "Valid" : "Invalid"}`);
  if (!result.isValid) {
    console.log(`  └─ ${result.error}`);
  }
});

// ==================== ПРИМЕР 9: Расчет срока аттестации ====================

console.log("\n=== ПРИМЕР 9: Расчет срока аттестации ===");

// Аттестация открывается сегодня
const startDate = getTodayString();
console.log("Дата открытия:", startDate);

// Аттестация закрывается через 14 дней
const endDate = addDaysToDate(startDate, 14);
console.log("Дата закрытия (через 14 дней):", endDate);

// Проверяем, что диапазон корректный
const rangeResult = validateDateRange(startDate, endDate);
console.log("Проверка диапазона:", rangeResult);

// Преобразуем для отправки на backend
const assessmentData = {
  openAt: dateToISOWithMidnight(startDate),
  closeAt: dateToISOWithMidnight(endDate),
  title: "Аттестация Q4 2025",
};
console.log("Данные для backend:", assessmentData);

export default exampleComponent;
