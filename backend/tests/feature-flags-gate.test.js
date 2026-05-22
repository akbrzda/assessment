const test = require("node:test");
const assert = require("node:assert/strict");

const settingsService = require("../src/services/settingsService");
const featureFlagsGate = require("../src/middleware/featureFlagsGate");
const { getModuleCodeByPath } = require("../src/config/featureFlags");

function createRes() {
  const payload = { statusCode: null, body: null };
  return {
    payload,
    status(code) {
      payload.statusCode = code;
      return this;
    },
    json(body) {
      payload.body = body;
      return this;
    },
  };
}

test("feature route mapping покрывает критичные префиксы", () => {
  assert.equal(getModuleCodeByPath("/admin/question-bank"), "questions");
  assert.equal(getModuleCodeByPath("/admin/certificates/export"), "certificates");
  assert.equal(getModuleCodeByPath("/verify/abc"), "certificates");
  assert.equal(getModuleCodeByPath("/admin/dashboard/summary"), "analytics");
  assert.equal(getModuleCodeByPath("/admin/search/users"), "users");
});

test("featureFlagsGate блокирует отключенный модуль", async () => {
  const original = settingsService.getSetting;
  settingsService.getSetting = async () => JSON.stringify(["questions"]);

  const req = { path: "/admin/question-bank" };
  const res = createRes();
  let nextCalled = false;

  await featureFlagsGate(req, res, () => {
    nextCalled = true;
  });

  settingsService.getSetting = original;

  assert.equal(nextCalled, false);
  assert.equal(res.payload.statusCode, 403);
  assert.equal(res.payload.body.code, "module_disabled");
  assert.equal(res.payload.body.moduleCode, "questions");
});

test("featureFlagsGate пропускает модуль, если он включен", async () => {
  const original = settingsService.getSetting;
  settingsService.getSetting = async () => JSON.stringify(["certificates"]);

  const req = { path: "/admin/question-bank" };
  const res = createRes();
  let nextCalled = false;

  await featureFlagsGate(req, res, () => {
    nextCalled = true;
  });

  settingsService.getSetting = original;

  assert.equal(nextCalled, true);
  assert.equal(res.payload.statusCode, null);
});
