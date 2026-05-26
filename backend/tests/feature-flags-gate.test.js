const test = require("node:test");
const assert = require("node:assert/strict");

const settingsService = require("../src/services/settingsService");
const featureFlagsGate = require("../src/middleware/featureFlagsGate");
const { getModuleCodeByPath, parseDisabledModules } = require("../src/config/featureFlags");

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
  assert.equal(getModuleCodeByPath("/unknown-route"), null);
});

test("parseDisabledModules возвращает пустой Set для строки null", () => {
  const disabledModules = parseDisabledModules("null");
  assert.equal(disabledModules.size, 0);
});

test("parseDisabledModules фильтрует пустые значения и null из массива", () => {
  const disabledModules = parseDisabledModules(JSON.stringify(["courses", "", null, "   ", "  assessments  "]));
  assert.deepEqual(Array.from(disabledModules), ["courses", "assessments"]);
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

test("featureFlagsGate вызывает next, если disabledModules пустой массив", async () => {
  const original = settingsService.getSetting;
  settingsService.getSetting = async () => JSON.stringify([]);

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

test("featureFlagsGate передает ошибку в next при reject settingsService.getSetting", async () => {
  const original = settingsService.getSetting;
  const expectedError = new Error("settings unavailable");
  settingsService.getSetting = async () => {
    throw expectedError;
  };

  const req = { path: "/admin/question-bank" };
  const res = createRes();
  let receivedError = null;

  await featureFlagsGate(req, res, (error) => {
    receivedError = error;
  });

  settingsService.getSetting = original;

  assert.equal(receivedError, expectedError);
  assert.equal(res.payload.statusCode, null);
});
