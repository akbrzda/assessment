const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const { pool } = require("../src/config/database");
const permissionService = require("../src/services/PermissionService");

const originalQuery = pool.query;

describe("PermissionService", () => {
  let queryCalls = 0;

  beforeEach(() => {
    queryCalls = 0;
    pool.query = async () => {
      queryCalls += 1;
      return [[]];
    };
  });

  afterEach(() => {
    pool.query = originalQuery;
  });

  it("возвращает deny при отсутствии пользователя", async () => {
    const result = await permissionService.can(null, "users", "user", "read");
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "no_user");
  });

  it("возвращает deny для неактивного пользователя", async () => {
    const result = await permissionService.can({ id: 1, role: "manager", is_active: 0 }, "users", "user", "read");
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "user_inactive");
  });

  it("пропускает superadmin без запросов в БД", async () => {
    const result = await permissionService.can({ id: 1, role: "superadmin", is_active: 1 }, "users", "user", "read");
    assert.equal(result.allowed, true);
    assert.equal(result.reason, "superadmin");
    assert.equal(queryCalls, 0);
  });

  it("возвращает deny если permission не найден", async () => {
    pool.query = async () => [[]];
    const result = await permissionService.can({ id: 2, role: "manager", is_active: 1 }, "users", "user", "read");
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "permission_not_found");
  });

  it("user override deny выше role allow", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) return [[{ id: 10 }]];
      if (call === 2) return [[{ effect: "deny", conditionsJson: null }]];
      if (call === 3) return [[{ effect: "allow", conditionsJson: null }]];
      return [[]];
    };

    const result = await permissionService.can({ id: 5, role: "manager", is_active: 1 }, "users", "user", "read");
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "user_explicit_deny");
  });

  it("user override allow возвращает доступ", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) return [[{ id: 10 }]];
      if (call === 2) return [[{ effect: "allow", conditionsJson: null }]];
      return [[]];
    };

    const result = await permissionService.can({ id: 5, role: "manager", is_active: 1 }, "users", "user", "read");
    assert.equal(result.allowed, true);
    assert.equal(result.reason, "user_explicit_allow");
  });

  it("role deny выше role allow", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) return [[{ id: 10 }]];
      if (call === 2) return [[]];
      if (call === 3)
        return [
          [
            { effect: "deny", conditionsJson: null },
            { effect: "allow", conditionsJson: null },
          ],
        ];
      return [[]];
    };

    const result = await permissionService.can({ id: 7, role: "manager", is_active: 1 }, "users", "user", "read");
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "role_deny");
  });

  it("role allow дает доступ", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) return [[{ id: 10 }]];
      if (call === 2) return [[]];
      if (call === 3) return [[{ effect: "allow", conditionsJson: null }]];
      return [[]];
    };

    const result = await permissionService.can({ id: 7, role: "manager", is_active: 1 }, "users", "user", "read");
    assert.equal(result.allowed, true);
    assert.equal(result.reason, "role_allow");
  });

  it("default deny при отсутствии подходящих правил", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) return [[{ id: 10 }]];
      if (call === 2) return [[]];
      if (call === 3) return [[]];
      return [[]];
    };

    const result = await permissionService.can({ id: 7, role: "manager", is_active: 1 }, "users", "user", "read");
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "default_deny");
  });

  it("условия override не выполнены и решение уходит в role", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) return [[{ id: 10 }]];
      if (call === 2) return [[{ effect: "allow", conditionsJson: { branchId: 2 } }]];
      if (call === 3) return [[{ effect: "allow", conditionsJson: null }]];
      return [[]];
    };

    const result = await permissionService.can({ id: 5, role: "manager", is_active: 1 }, "users", "user", "read", { branchId: 1 });

    assert.equal(result.allowed, true);
    assert.equal(result.reason, "role_allow");
  });

  it("deny с невыполненными условиями не блокирует доступ", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) return [[{ id: 10 }]];
      if (call === 2) return [[]];
      if (call === 3)
        return [
          [
            { effect: "deny", conditionsJson: { branchId: 2 } },
            { effect: "allow", conditionsJson: null },
          ],
        ];
      return [[]];
    };

    const result = await permissionService.can({ id: 7, role: "manager", is_active: 1 }, "users", "user", "read", { branchId: 1 });

    assert.equal(result.allowed, true);
    assert.equal(result.reason, "role_allow");
  });

  it("evaluateConditions поддерживает branchId/ownerId/status", async () => {
    const ok = await permissionService.evaluateConditions(
      { branchId: 1, ownerId: 2, status: ["open", "closed"] },
      { branchId: 1, ownerId: 2, status: "open" },
    );
    const fail = await permissionService.evaluateConditions({ branchId: 1 }, { branchId: 2 });
    assert.equal(ok, true);
    assert.equal(fail, false);
  });

  it("evaluateConditions возвращает true для пустых условий", async () => {
    assert.equal(await permissionService.evaluateConditions(null, {}), true);
    assert.equal(await permissionService.evaluateConditions({}, {}), true);
  });

  it("evaluateConditions возвращает false для невалидного JSON", async () => {
    const result = await permissionService.evaluateConditions("{broken-json", { branchId: 1 });
    assert.equal(result, false);
  });

  it("evaluateConditions возвращает false для не-объекта", async () => {
    assert.equal(await permissionService.evaluateConditions(42, {}), false);
    assert.equal(await permissionService.evaluateConditions("42", {}), false);
  });

  it("evaluateConditions проверяет ownerId", async () => {
    assert.equal(await permissionService.evaluateConditions({ ownerId: 5 }, { ownerId: 5 }), true);
    assert.equal(await permissionService.evaluateConditions({ ownerId: 5 }, { ownerId: 6 }), false);
  });

  it("evaluateConditions поддерживает status как строку", async () => {
    assert.equal(await permissionService.evaluateConditions({ status: "open" }, { status: "open" }), true);
    assert.equal(await permissionService.evaluateConditions({ status: "open" }, { status: "closed" }), false);
  });

  it("getPermissionId возвращает id права", async () => {
    pool.query = async () => [[{ id: 77 }]];
    const permissionId = await permissionService.getPermissionId("users", "user", "read");
    assert.equal(permissionId, 77);
  });

  it("getPermissionId возвращает null, если право не найдено", async () => {
    pool.query = async () => [[]];
    const permissionId = await permissionService.getPermissionId("users", "user", "read");
    assert.equal(permissionId, null);
  });

  it("getUserOverride возвращает первую активную запись", async () => {
    pool.query = async () => [[{ effect: "deny", conditionsJson: null }]];
    const override = await permissionService.getUserOverride(10, 11);
    assert.deepEqual(override, { effect: "deny", conditionsJson: null });
  });

  it("getRolePermissions возвращает массив правил роли", async () => {
    pool.query = async () => [[{ effect: "allow", conditionsJson: null }]];
    const rules = await permissionService.getRolePermissions(10, 11);
    assert.equal(Array.isArray(rules), true);
    assert.equal(rules.length, 1);
  });

  it("getEffectivePermissions применяет override поверх inherited", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) {
        return [[{ permissionId: 1, moduleCode: "users", entityCode: "user", actionCode: "read", effect: "allow" }]];
      }
      if (call === 2) {
        return [
          [{ permissionId: 1, moduleCode: "users", entityCode: "user", actionCode: "read", effect: "deny", reason: "manual", expiresAt: null }],
        ];
      }
      if (call === 3) {
        return [[{ id: 1, roleId: 3, roleName: "manager", assignedAt: "2026-01-01 00:00:00", expiresAt: null, assignedBy: 2 }]];
      }
      return [[]];
    };

    const result = await permissionService.getEffectivePermissions(10);
    assert.equal(result.effective.length, 1);
    assert.equal(result.effective[0].effect, "deny");
    assert.equal(result.effective[0].source, "override");
    assert.equal(result.roles.length, 1);
  });

  it("can использует roleName как fallback поля роли", async () => {
    const result = await permissionService.can({ id: 1, roleName: "superadmin", is_active: 1 }, "users", "user", "read");
    assert.equal(result.allowed, true);
    assert.equal(result.reason, "superadmin");
  });
});
