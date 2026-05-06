const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const { pool } = require("../../src/config/database");

function loadRolesServiceWithAuditStub() {
  const servicePath = require.resolve("../../src/modules/admin/roles/service");
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
  const rolesService = require(servicePath);

  return {
    rolesService,
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

describe("API контракт /admin/roles", () => {
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;

  let rolesServiceRef = null;

  beforeEach(() => {
    const loaded = loadRolesServiceWithAuditStub();
    rolesServiceRef = loaded;

    pool.query = async () => [[]];
    pool.getConnection = async () => ({
      query: async () => [[]],
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    });
  });

  afterEach(() => {
    pool.query = originalQuery;
    pool.getConnection = originalGetConnection;
    rolesServiceRef.restore();
  });

  it("GET /admin/roles возвращает list-контракт", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) {
        return [[{ total: 2 }]];
      }
      return [
        [
          {
            id: 1,
            code: "manager",
            name: "manager",
            description: null,
            priority: 10,
            is_system: 1,
            is_active: 1,
            permissions_count: 3,
            users_count: 5,
          },
        ],
      ];
    };

    const req = { query: { page: "1", limit: "20" } };
    const res = createResponseMock();

    await rolesServiceRef.rolesService.list(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 200);
    assert.equal(Array.isArray(res.payload.body.roles), true);
    assert.equal(res.payload.body.total, 2);
    assert.equal(res.payload.body.page, 1);
    assert.equal(res.payload.body.limit, 20);
  });

  it("GET /admin/roles/:id возвращает 400 при невалидном id", async () => {
    const req = { params: { id: "invalid" } };
    const res = createResponseMock();

    await rolesServiceRef.rolesService.getById(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 400);
    assert.equal(res.payload.body.error, "Некорректный идентификатор роли");
  });

  it("GET /admin/roles/:id возвращает 404 если роль не найдена", async () => {
    pool.query = async () => [[]];

    const req = { params: { id: "99" } };
    const res = createResponseMock();

    await rolesServiceRef.rolesService.getById(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 404);
    assert.equal(res.payload.body.error, "Роль не найдена");
  });

  it("GET /admin/roles/:id возвращает role, permissions, availablePermissions, users", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) {
        return [[{ id: 7, code: "manager", name: "manager", description: null, priority: 10, is_system: 1, is_active: 1 }]];
      }
      if (call === 2) {
        return [
          [
            {
              id: 100,
              permissionId: 5,
              moduleCode: "users",
              entityCode: "user",
              actionCode: "read",
              effect: "allow",
              conditions: null,
              expiresAt: null,
            },
          ],
        ];
      }
      if (call === 3) {
        return [[{ permissionId: 5, moduleCode: "users", entityCode: "user", actionCode: "read" }]];
      }
      return [[{ id: 1, firstName: "Иван", lastName: "Петров", assignedAt: null, expiresAt: null, isActive: 1 }]];
    };

    const req = { params: { id: "7" } };
    const res = createResponseMock();

    await rolesServiceRef.rolesService.getById(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 200);
    assert.ok(res.payload.body.role);
    assert.equal(Array.isArray(res.payload.body.permissions), true);
    assert.equal(Array.isArray(res.payload.body.availablePermissions), true);
    assert.equal(Array.isArray(res.payload.body.users), true);
  });

  it("POST /admin/roles/:id/permissions возвращает 422 при невалидном payload", async () => {
    const req = { params: { id: "3" }, body: { permissions: [{ permissionId: 5 }] } };
    const res = createResponseMock();

    await rolesServiceRef.rolesService.updatePermissions(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(res.payload.statusCode, 422);
    assert.ok(String(res.payload.body.error).length > 0);
  });

  it("POST /admin/roles/:id/permissions сохраняет и возвращает контракт", async () => {
    let deleted = false;
    let inserted = false;

    pool.getConnection = async () => ({
      query: async (sql) => {
        const statement = String(sql);
        if (statement.includes("SELECT id, name FROM roles")) {
          return [[{ id: 3, name: "manager" }]];
        }
        if (statement.includes("DELETE FROM role_permissions")) {
          deleted = true;
          return [{ affectedRows: 1 }];
        }
        if (statement.includes("INSERT INTO role_permissions")) {
          inserted = true;
          return [{ affectedRows: 1 }];
        }
        return [[]];
      },
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    });

    const req = {
      params: { id: "3" },
      body: {
        permissions: [
          {
            permissionId: 9,
            effect: "allow",
            conditions: { branchId: 1 },
            expiresAt: null,
          },
        ],
      },
      user: { id: 55 },
    };
    const res = createResponseMock();

    await rolesServiceRef.rolesService.updatePermissions(req, res, (error) => {
      if (error) throw error;
    });

    assert.equal(deleted, true);
    assert.equal(inserted, true);
    assert.equal(res.payload.statusCode, 200);
    assert.equal(res.payload.body.role.id, 3);
    assert.equal(Array.isArray(res.payload.body.permissions), true);
    assert.equal(res.payload.body.permissions.length, 1);
  });
});
