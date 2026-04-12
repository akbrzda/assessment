const test = require("node:test");
const assert = require("node:assert/strict");

const adminModule = require("../src/modules/admin");
const assessmentsModule = require("../src/modules/assessment/admin");
const usersRoutes = require("../src/modules/admin/users");
const authRoutes = require("../src/modules/admin/auth");
const analyticsRoutes = require("../src/modules/analytics/admin/routes");

function assertRouter(router, moduleName) {
  assert.ok(router, `${moduleName}: роутер не экспортирован`);
  assert.equal(typeof router, "function", `${moduleName}: роутер должен быть функцией`);
  assert.ok(Array.isArray(router.stack), `${moduleName}: у роутера отсутствует stack`);
  assert.ok(router.stack.length > 0, `${moduleName}: роутер не содержит маршрутов`);
}

test("admin module exports domain map", () => {
  assert.equal(typeof adminModule, "object", "admin: должен экспортироваться объект доменов");
  assert.ok(adminModule.assessments, "admin: отсутствует домен assessments");
  assert.ok(adminModule.users, "admin: отсутствует домен users");
  assert.ok(adminModule.auth, "admin: отсутствует домен auth");
});

test("assessments module exports router and controller", () => {
  assertRouter(assessmentsModule.routes, "admin/assessments");
  assert.ok(assessmentsModule.controller, "admin/assessments: контроллер не экспортирован");
});

test("users module exports router", () => {
  assertRouter(usersRoutes, "admin/users");
});

test("auth module exports router", () => {
  assertRouter(authRoutes, "admin/auth");
});

test("analytics module exports router", () => {
  assertRouter(analyticsRoutes, "admin/analytics");
});
