/**
 * Unit-тесты: расчёт прогресса курса (только обязательные разделы).
 * Тестируют чистую функцию без обращения к БД.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateProgressPercent } = require("../../src/services/coursesLogic");

test("прогресс: 0 из 4 обязательных разделов → 0%", () => {
  assert.equal(calculateProgressPercent(0, 4), 0);
});

test("прогресс: 1 из 4 обязательных разделов → 25%", () => {
  assert.equal(calculateProgressPercent(1, 4), 25);
});

test("прогресс: 2 из 4 обязательных разделов → 50%", () => {
  assert.equal(calculateProgressPercent(2, 4), 50);
});

test("прогресс: 4 из 4 обязательных разделов → 100%", () => {
  assert.equal(calculateProgressPercent(4, 4), 100);
});

test("прогресс: нет обязательных разделов → 0% (деление на ноль защищено)", () => {
  assert.equal(calculateProgressPercent(0, 0), 0);
});

test("прогресс: необязательные разделы не учитываются (вычисление только по переданным)", () => {
  // 3 из 5 обязательных — необязательные разделы не передаются в функцию
  assert.equal(calculateProgressPercent(3, 5), 60);
});

test("прогресс: дробный результат округляется до двух знаков", () => {
  // 1 из 3 = 33.33...
  assert.equal(calculateProgressPercent(1, 3), 33.33);
});

test("прогресс: totalRequired отрицательный → 0%", () => {
  assert.equal(calculateProgressPercent(0, -1), 0);
});
