/**
 * Unit-тесты: логика завершения раздела и блокировки.
 * Тестируют чистые функции без обращения к БД.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { sectionStatusAfterAttempt, checkAllTopicsCompleted, isSectionLocked, isTopicLocked } = require("../../src/services/coursesLogic");

// --- sectionStatusAfterAttempt ------------------------------------------------

test("раздел: успешная сдача теста раздела -> passed", () => {
  assert.equal(sectionStatusAfterAttempt(true), "passed");
});

test("раздел: провал теста раздела -> failed", () => {
  assert.equal(sectionStatusAfterAttempt(false), "failed");
});

// --- checkAllTopicsCompleted --------------------------------------------------

test("блокировка: все темы завершены -> allCompleted = true", () => {
  const result = checkAllTopicsCompleted([{ status: "completed" }, { status: "completed" }]);
  assert.equal(result.allCompleted, true);
  assert.equal(result.completed, 2);
  assert.equal(result.total, 2);
});

test("блокировка: не все темы завершены -> allCompleted = false", () => {
  const result = checkAllTopicsCompleted([{ status: "completed" }, { status: "in_progress" }]);
  assert.equal(result.allCompleted, false);
  assert.equal(result.completed, 1);
  assert.equal(result.total, 2);
});

test("блокировка: нет тем в разделе -> allCompleted = true (ноль тем = ок)", () => {
  const result = checkAllTopicsCompleted([]);
  assert.equal(result.allCompleted, true);
  assert.equal(result.total, 0);
});

test("блокировка: первая тема не начата -> тест раздела недоступен", () => {
  const result = checkAllTopicsCompleted([{ status: "not_started" }]);
  assert.equal(result.allCompleted, false);
});

// --- isSectionLocked ----------------------------------------------------------

test("раздел: нет предыдущих разделов -> не заблокирован", () => {
  assert.equal(isSectionLocked([]), false);
});

test("раздел: предыдущий обязательный раздел не сдан -> заблокирован", () => {
  const prev = [{ isRequired: true, userStatus: "in_progress" }];
  assert.equal(isSectionLocked(prev), true);
});

test("раздел: предыдущий обязательный раздел сдан -> не заблокирован", () => {
  const prev = [{ isRequired: true, userStatus: "passed" }];
  assert.equal(isSectionLocked(prev), false);
});

test("раздел: предыдущий необязательный раздел не сдан -> не заблокирован", () => {
  const prev = [{ isRequired: false, userStatus: "not_started" }];
  assert.equal(isSectionLocked(prev), false);
});

test("раздел: смесь — обязательный сдан, необязательный нет -> не заблокирован", () => {
  const prev = [
    { isRequired: true, userStatus: "passed" },
    { isRequired: false, userStatus: "not_started" },
  ];
  assert.equal(isSectionLocked(prev), false);
});

// --- isTopicLocked ------------------------------------------------------------

test("тема: нет предыдущей темы -> не заблокирована", () => {
  assert.equal(isTopicLocked(null), false);
});

test("тема: предыдущая тема завершена -> не заблокирована", () => {
  assert.equal(isTopicLocked({ status: "completed" }), false);
});

test("тема: предыдущая тема в процессе -> заблокирована", () => {
  assert.equal(isTopicLocked({ status: "in_progress" }), true);
});

test("тема: предыдущая тема не начата -> заблокирована", () => {
  assert.equal(isTopicLocked({ status: "not_started" }), true);
});

test("тема: предыдущая тема провалена -> заблокирована", () => {
  assert.equal(isTopicLocked({ status: "failed" }), true);
});
