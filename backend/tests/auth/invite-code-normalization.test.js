const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeInviteCode } = require("../../src/utils/inviteCode");

test("normalizeInviteCode: принимает invite_/invite-/code- и возвращает валидный код", () => {
  assert.equal(normalizeInviteCode("invite_ab12"), "AB12");
  assert.equal(normalizeInviteCode("invite-zz99"), "ZZ99");
  assert.equal(normalizeInviteCode("code-x1y2"), "X1Y2");
  assert.equal(normalizeInviteCode("a1b2c3"), "A1B2C3");
});

test("normalizeInviteCode: отклоняет startapp payload, который не является инвайт-кодом", () => {
  assert.equal(normalizeInviteCode("course_123"), null);
  assert.equal(normalizeInviteCode("home"), "HOME");
  assert.equal(normalizeInviteCode("abc"), null);
  assert.equal(normalizeInviteCode("invite_абвг"), null);
});

