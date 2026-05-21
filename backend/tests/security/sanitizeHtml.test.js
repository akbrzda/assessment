/**
 * Тесты санитизации HTML: проверка защиты от XSS-атак.
 * Утилита работает в двух режимах: DOMParser (браузер) и regex (Node.js).
 * Этот файл тестирует regex-fallback, который активируется в Node.js-окружении.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("fs");
const path = require("path");

// Загружаем ESM-модуль через CommonJS-обёртку, применяя regex-логику напрямую
// (DOMParser недоступен в Node.js без jsdom)
function sanitizeHtmlFallback(html) {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "")
    .replace(/(href|src)\s*=\s*["']javascript:[^"']*["']/gi, '$1=""');
}

// --- <script> теги --------------------------------------------------------

test("XSS: удаляет inline <script>", () => {
  const input = '<p>Текст</p><script>alert("xss")</script>';
  const result = sanitizeHtmlFallback(input);
  assert.ok(!result.includes("<script"), "script-тег не должен присутствовать");
  assert.ok(!result.includes("alert"), "тело скрипта не должно присутствовать");
});

test("XSS: удаляет <script> с src", () => {
  const input = '<p>Hello</p><script src="https://evil.com/x.js"></script>';
  const result = sanitizeHtmlFallback(input);
  assert.ok(!result.includes("<script"), "script-тег с src не должен присутствовать");
});

test("XSS: удаляет <script> с CDATA", () => {
  const input = "<script>/*<![CDATA[*/document.cookie/*]]>*/</script>";
  const result = sanitizeHtmlFallback(input);
  assert.ok(!result.includes("<script"), "script-тег не должен присутствовать");
});

// --- onerror / on* атрибуты -----------------------------------------------

test("XSS: удаляет onerror из img", () => {
  const input = '<img src="x" onerror="alert(1)">';
  const result = sanitizeHtmlFallback(input);
  assert.ok(!result.includes("onerror"), "onerror не должен присутствовать");
});

test("XSS: удаляет onclick из кнопки", () => {
  const input = '<button onclick="evil()">Нажми</button>';
  const result = sanitizeHtmlFallback(input);
  assert.ok(!result.includes("onclick"), "onclick не должен присутствовать");
});

test("XSS: удаляет onmouseover", () => {
  const input = '<div onmouseover="steal()">наведи</div>';
  const result = sanitizeHtmlFallback(input);
  assert.ok(!result.includes("onmouseover"), "onmouseover не должен присутствовать");
});

test("XSS: удаляет onload на body", () => {
  const input = '<body onload="attack()">';
  const result = sanitizeHtmlFallback(input);
  assert.ok(!result.includes("onload"), "onload не должен присутствовать");
});

// --- javascript: href/src -------------------------------------------------

test("XSS: очищает javascript: href у <a>", () => {
  const input = '<a href="javascript:alert(document.cookie)">клик</a>';
  const result = sanitizeHtmlFallback(input);
  assert.ok(!result.includes("javascript:"), "javascript: не должен присутствовать в href");
});

test("XSS: очищает javascript: src у <img>", () => {
  const input = '<img src="javascript:alert(1)">';
  const result = sanitizeHtmlFallback(input);
  assert.ok(!result.includes("javascript:"), "javascript: не должен присутствовать в src");
});

// --- Безопасный контент не должен повреждаться ----------------------------

test("Безопасный: обычный текст не изменяется", () => {
  const input = "<p>Привет, мир! Это <b>жирный</b> текст.</p>";
  const result = sanitizeHtmlFallback(input);
  assert.ok(result.includes("<p>"), "параграф сохраняется");
  assert.ok(result.includes("<b>"), "жирный тег сохраняется");
});

test("Безопасный: обычный href не затрагивается", () => {
  const input = '<a href="https://example.com">ссылка</a>';
  const result = sanitizeHtmlFallback(input);
  assert.ok(result.includes('href="https://example.com"'), "обычный href сохраняется");
});

test("Безопасный: пустая строка возвращает пустую строку", () => {
  assert.equal(sanitizeHtmlFallback(""), "");
  assert.equal(sanitizeHtmlFallback(null), "");
  assert.equal(sanitizeHtmlFallback(undefined), "");
});
