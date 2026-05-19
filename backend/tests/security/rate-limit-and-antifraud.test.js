const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("rate limit: login-роут админки содержит ограничение 5 попыток за окно", () => {
  const routesPath = path.resolve(__dirname, "../../src/modules/auth/admin/routes.js");
  const content = fs.readFileSync(routesPath, "utf8");

  assert.match(content, /max:\s*5/);
  assert.match(content, /windowMs:\s*15\s*\*\s*60\s*\*\s*1000/);
});

test("rate limit: глобальный лимитер админ API подключен в app.js", () => {
  const appPath = path.resolve(__dirname, "../../src/app.js");
  const content = fs.readFileSync(appPath, "utf8");

  assert.match(content, /adminGlobalLimiter/);
  assert.match(content, /apiRouter\.use\("\/admin",\s*adminGlobalLimiter\)/);
});

test("антифрод: invite-flow требует подтвержденный contact payload", () => {
  const servicePath = path.resolve(__dirname, "../../src/modules/auth/public/service.js");
  const content = fs.readFileSync(servicePath, "utf8");

  assert.match(content, /Для активации по приглашению подтвердите номер телефона/);
  assert.match(content, /contact\.source !== expectedSource/);
  assert.match(content, /String\(contact\.userId\) !== String\(platformUser\.id\)/);
});
