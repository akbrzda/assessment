const test = require("node:test");
const assert = require("node:assert/strict");

process.env.BOT_TOKEN = process.env.BOT_TOKEN || "123456:abcdefghijklmnopqrstuvwxyzABCDE12345";
process.env.BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

const { sanitizeStartPayload } = require("../src/index");

test("sanitizeStartPayload очищает небезопасный start payload", () => {
  assert.equal(sanitizeStartPayload("invite_valid_123"), "invite_valid_123");
  assert.equal(sanitizeStartPayload("invite_../etc/passwd"), "");
  assert.equal(sanitizeStartPayload("<script>alert(1)</script>"), "");
});

