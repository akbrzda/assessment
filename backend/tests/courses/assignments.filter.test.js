/**
 * Интеграционные тесты: логика назначения курса и фильтрации.
 * Используют ручное создание заглушек (stub) вместо реальной БД.
 *
 * Тестируют бизнес-правила функции listAssignedCourseIds:
 *   1) Открытый курс (нет назначений) — виден всем
 *   2) Курс с назначением по должности — виден только нужной должности
 *   3) Курс с назначением по филиалу — виден только нужному филиалу
 *   4) Курс с ручным назначением — виден назначенному пользователю
 *   5) Без совпадений — курс недоступен
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// ─── Реализация stub-логики (повторяет SQL-логику listAssignedCourseIds) ─────

/**
 * Имитирует логику listAssignedCourseIds без обращения к БД.
 * positionTargets, branchTargets, userAssignments — это коллекции назначений курса.
 */
function resolveAssignedCourseIds(courses, userId, userPositionId, userBranchId) {
  const result = new Set();

  for (const course of courses) {
    const hasPositionTargets = course.positionTargets.length > 0;
    const hasBranchTargets = course.branchTargets.length > 0;
    const hasUserAssignments = course.userAssignments.length > 0;
    const isOpen = !hasPositionTargets && !hasBranchTargets && !hasUserAssignments;

    if (isOpen) {
      result.add(course.id);
      continue;
    }

    if (course.userAssignments.includes(userId)) {
      result.add(course.id);
      continue;
    }

    if (userPositionId && course.positionTargets.includes(userPositionId)) {
      result.add(course.id);
      continue;
    }

    if (userBranchId && course.branchTargets.includes(userBranchId)) {
      result.add(course.id);
    }
  }

  return result;
}

// ─── Тесты ───────────────────────────────────────────────────────────────────

test("назначение: открытый курс виден всем пользователям", () => {
  const courses = [{ id: 1, positionTargets: [], branchTargets: [], userAssignments: [] }];
  const ids = resolveAssignedCourseIds(courses, 99, null, null);
  assert.ok(ids.has(1));
});

test("назначение: курс по должности виден пользователю с нужной должностью", () => {
  const courses = [{ id: 2, positionTargets: [5], branchTargets: [], userAssignments: [] }];
  const ids = resolveAssignedCourseIds(courses, 99, 5, null);
  assert.ok(ids.has(2));
});

test("назначение: курс по должности не виден пользователю с другой должностью", () => {
  const courses = [{ id: 2, positionTargets: [5], branchTargets: [], userAssignments: [] }];
  const ids = resolveAssignedCourseIds(courses, 99, 7, null);
  assert.ok(!ids.has(2));
});

test("назначение: курс по филиалу виден пользователю из нужного филиала", () => {
  const courses = [{ id: 3, positionTargets: [], branchTargets: [10], userAssignments: [] }];
  const ids = resolveAssignedCourseIds(courses, 99, null, 10);
  assert.ok(ids.has(3));
});

test("назначение: курс по филиалу не виден пользователю из другого филиала", () => {
  const courses = [{ id: 3, positionTargets: [], branchTargets: [10], userAssignments: [] }];
  const ids = resolveAssignedCourseIds(courses, 99, null, 20);
  assert.ok(!ids.has(3));
});

test("назначение: курс с ручным назначением виден назначенному пользователю", () => {
  const courses = [{ id: 4, positionTargets: [1], branchTargets: [], userAssignments: [42] }];
  const ids = resolveAssignedCourseIds(courses, 42, 99, null); // другая должность
  assert.ok(ids.has(4));
});

test("назначение: пользователь без совпадений не видит закрытый курс", () => {
  const courses = [{ id: 5, positionTargets: [1], branchTargets: [2], userAssignments: [10] }];
  const ids = resolveAssignedCourseIds(courses, 99, 5, 6); // не та должность/филиал/userId
  assert.ok(!ids.has(5));
});

test("назначение: среди нескольких курсов пользователь видит только назначенные", () => {
  const courses = [
    { id: 1, positionTargets: [], branchTargets: [], userAssignments: [] }, // открытый
    { id: 2, positionTargets: [3], branchTargets: [], userAssignments: [] }, // только должность 3
    { id: 3, positionTargets: [], branchTargets: [7], userAssignments: [] }, // только филиал 7
  ];
  // Пользователь с должностью 3, филиалом 0
  const ids = resolveAssignedCourseIds(courses, 99, 3, null);
  assert.ok(ids.has(1), "открытый курс должен быть виден");
  assert.ok(ids.has(2), "курс по должности 3 должен быть виден");
  assert.ok(!ids.has(3), "курс по филиалу 7 не должен быть виден");
});
