/**
 * Unit-тесты: логика завершения темы (3 варианта).
 * Тестируют чистые функции без обращения к БД.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { topicStatusAfterMaterialView, topicStatusAfterAttempt } = require("../../src/services/coursesLogic");

// ─── topicStatusAfterMaterialView ────────────────────────────────────────────

test("тема только с материалом: просмотр завершает тему", () => {
  const status = topicStatusAfterMaterialView(true, null);
  assert.equal(status, "completed");
});

test("тема с материалом и тестом: просмотр переводит в in_progress", () => {
  const status = topicStatusAfterMaterialView(true, 42);
  assert.equal(status, "in_progress");
});

test("тема без материала: вызов бросает ошибку 422", () => {
  assert.throws(
    () => topicStatusAfterMaterialView(false, null),
    (err) => {
      assert.equal(err.status, 422);
      return true;
    },
  );
});

// ─── topicStatusAfterAttempt ─────────────────────────────────────────────────

test("тема только с тестом: успешная сдача завершает тему", () => {
  const status = topicStatusAfterAttempt(true);
  assert.equal(status, "completed");
});

test("тема только с тестом: провал переводит в failed", () => {
  const status = topicStatusAfterAttempt(false);
  assert.equal(status, "failed");
});

test("тема с материалом и тестом: успешная сдача завершает тему", () => {
  // Материал уже просмотрен ранее, теперь тест
  const status = topicStatusAfterAttempt(true);
  assert.equal(status, "completed");
});

test("тема с материалом и тестом: провал теста переводит в failed", () => {
  const status = topicStatusAfterAttempt(false);
  assert.equal(status, "failed");
});
