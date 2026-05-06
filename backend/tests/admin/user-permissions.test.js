const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const { pool } = require("../../src/config/database");
const permissionService = require("../../src/services/PermissionService");

function loadUsersServiceWithAuditStub() {
  const servicePath = require.resolve("../../src/modules/admin/users/service");
  const auditPath = require.resolve("../../src/services/auditService");

  const originalAuditExports = require(auditPath);
  const originalAuditCache = require.cache[auditPath];

  require.cache[auditPath] = {
    ...originalAuditCache,
    exports: {
      ...originalAuditExports,
      logAndSend: async () => {},
      buildActorFromRequest: () => ({ id: 1, role: "tester" }),
    },
  };

  delete require.cache[servicePath];
  const usersService = require(servicePath);

  return {
    usersService,
    restore() {
      require.cache[auditPath] = originalAuditCache;
      delete require.cache[servicePath];
    },
  };
}

function createResponseMock() {
  const payload = { statusCode: 200, body: null };
  return {
    payload,
    status(code) {
      payload.statusCode = code;
      return this;
    },
    json(data) {
      payload.body = data;
      return this;
    },
    send(data) {
      payload.body = data;
      return this;
    },
  };
}

describe("API контракт /admin/users/:id/permissions", () => {
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const originalGetEffectivePermissions = permissionService.getEffectivePermissions;

  let usersServiceRef = null;

  beforeEach(() => {
    usersServiceRef = loadUsersServiceWithAuditStub();

    pool.query = async () => [[]];
    pool.getConnection = async () => ({
      query: async () => [[]],
      release: () => {},
    });
    permissionService.getEffectivePermissions = async () => ({
      effective: [],
      inherited: [],
      overrides: [],
      roles: [],
    });
  });

  afterEach(() => {
    pool.query = originalQuery;
    pool.getConnection = originalGetConnection;
    permissionService.getEffectivePermissions = originalGetEffectivePermissions;
    usersServiceRef.restore();
  });

  it("GET /admin/users/:id/permissions возвращает 400 при невалидном id", async () => {
    const req = { params: { id: "abc" } };
    const res = createResponseMock();

    await usersServiceRef.usersService.getPermissions(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 400);
    assert.equal(res.payload.body.error, "Некорректный идентификатор пользователя");
  });

  it("GET /admin/users/:id/permissions возвращает 404 если пользователь не найден", async () => {
    pool.query = async () => [[]];

    const req = { params: { id: "99" } };
    const res = createResponseMock();

    await usersServiceRef.usersService.getPermissions(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 404);
    assert.equal(res.payload.body.error, "Пользователь не найден");
  });

  it("GET /admin/users/:id/permissions возвращает effective/inherited/overrides", async () => {
    pool.query = async () => [[{ id: 8 }]];
    permissionService.getEffectivePermissions = async () => ({
      effective: [{ permissionId: 1, effect: "allow", source: "role" }],
      inherited: [{ permissionId: 1, effect: "allow" }],
      overrides: [],
      roles: [{ roleId: 3, roleName: "manager" }],
    });

    const req = { params: { id: "8" } };
    const res = createResponseMock();

    await usersServiceRef.usersService.getPermissions(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 200);
    assert.equal(res.payload.body.userId, 8);
    assert.equal(Array.isArray(res.payload.body.effective), true);
    assert.equal(Array.isArray(res.payload.body.inherited), true);
    assert.equal(Array.isArray(res.payload.body.overrides), true);
  });

  it("POST /admin/users/:id/permissions/override возвращает 422 при невалидном payload", async () => {
    const req = {
      params: { id: "8" },
      body: { permissionId: 10 },
      user: { id: 1 },
    };
    const res = createResponseMock();

    await usersServiceRef.usersService.setPermissionOverride(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 422);
    assert.ok(String(res.payload.body.error).length > 0);
  });

  it("POST /admin/users/:id/permissions/override возвращает 200 при успешном сохранении", async () => {
    pool.getConnection = async () => ({
      query: async (sql) => {
        const statement = String(sql);
        if (statement.includes("SELECT id FROM users")) {
          return [[{ id: 8 }]];
        }
        if (statement.includes("SELECT id FROM permissions")) {
          return [[{ id: 10 }]];
        }
        if (statement.includes("INSERT INTO user_permission_overrides")) {
          return [{ affectedRows: 1 }];
        }
        return [[]];
      },
      release: () => {},
    });

    const req = {
      params: { id: "8" },
      body: {
        permissionId: 10,
        effect: "deny",
        reason: "Тест",
        expiresAt: null,
      },
      user: { id: 1 },
    };
    const res = createResponseMock();

    await usersServiceRef.usersService.setPermissionOverride(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 200);
    assert.equal(res.payload.body.message, "Переопределение права сохранено");
  });

  it("POST /admin/users/:id/roles добавляет роль и возвращает список активных ролей", async () => {
    let step = 0;
    pool.query = async () => {
      step += 1;
      if (step === 1) {
        return [[{ id: 8 }]];
      }
      if (step === 2) {
        return [[{ id: 3 }]];
      }
      if (step === 3) {
        return [{ affectedRows: 1 }];
      }
      return [[{ id: 1, roleId: 3, roleName: "manager", assignedAt: null, expiresAt: null, assignedBy: 1 }]];
    };

    const req = {
      params: { id: "8" },
      body: { roleId: 3, expiresAt: null },
      user: { id: 1 },
    };
    const res = createResponseMock();

    await usersServiceRef.usersService.addUserRole(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 200);
    assert.equal(res.payload.body.user.id, 8);
    assert.equal(Array.isArray(res.payload.body.roles), true);
    assert.equal(res.payload.body.roles.length, 1);
  });

  it("DELETE /admin/users/:id/roles/:roleId возвращает 404, если связи нет", async () => {
    pool.query = async () => [{ affectedRows: 0 }];

    const req = { params: { id: "8", roleId: "4" }, user: { id: 1 } };
    const res = createResponseMock();

    await usersServiceRef.usersService.removeUserRole(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 404);
    assert.equal(res.payload.body.error, "Роль пользователя не найдена");
  });

  it("DELETE /admin/users/:id/roles/:roleId возвращает 204 при успешном удалении", async () => {
    pool.query = async () => [{ affectedRows: 1 }];

    const req = { params: { id: "8", roleId: "4" }, user: { id: 1 } };
    const res = createResponseMock();

    await usersServiceRef.usersService.removeUserRole(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 204);
  });
});
