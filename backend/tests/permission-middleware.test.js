const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const permissionService = require("../src/services/PermissionService");
const { requirePermission } = require("../src/middleware/permission");

function createResponseMock() {
  const payload = {
    statusCode: null,
    jsonBody: null,
  };

  return {
    payload,
    status(code) {
      payload.statusCode = code;
      return this;
    },
    json(body) {
      payload.jsonBody = body;
      return this;
    },
  };
}

describe("requirePermission middleware", () => {
  const originalCan = permissionService.can;

  beforeEach(() => {
    permissionService.can = async () => ({ allowed: false, reason: "default_deny", source: "system" });
  });

  afterEach(() => {
    permissionService.can = originalCan;
  });

  it("возвращает 401 для неаутентифицированного запроса", async () => {
    const middleware = requirePermission("users", "user", "read");
    const req = { user: null };
    const res = createResponseMock();

    let nextCalled = false;
    await middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.payload.statusCode, 401);
    assert.equal(res.payload.jsonBody.error, "Доступ запрещен");
    assert.equal(res.payload.jsonBody.code, "default_deny");
  });

  it("возвращает 403 для аутентифицированного пользователя без прав", async () => {
    const middleware = requirePermission("users", "user", "update");
    const req = { user: { id: 77, role: "manager" } };
    const res = createResponseMock();

    let nextCalled = false;
    await middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.payload.statusCode, 403);
    assert.equal(res.payload.jsonBody.code, "default_deny");
    assert.equal(res.payload.jsonBody.details.actionCode, "update");
  });

  it("пропускает запрос при разрешенном доступе", async () => {
    permissionService.can = async () => ({ allowed: true, reason: "role_allow", source: "role" });

    const middleware = requirePermission("users", "user", "read");
    const req = { user: { id: 10, role: "manager" } };
    const res = createResponseMock();

    let nextCalled = false;
    await middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res.payload.statusCode, null);
    assert.equal(res.payload.jsonBody, null);
  });

  it("передает context из contextBuilder в PermissionService", async () => {
    let capturedContext = null;
    permissionService.can = async (_user, _moduleCode, _entityCode, _actionCode, context) => {
      capturedContext = context;
      return { allowed: true, reason: "role_allow", source: "role" };
    };

    const middleware = requirePermission("users", "user", "read", {
      contextBuilder: (req) => ({ branchId: req.user.branch_id }),
    });

    const req = { user: { id: 5, role: "manager", branch_id: 3 } };
    const res = createResponseMock();

    await middleware(req, res, () => {});

    assert.deepEqual(capturedContext, { branchId: 3 });
  });

  it("пробрасывает ошибку через next", async () => {
    const expectedError = new Error("permission service failed");
    permissionService.can = async () => {
      throw expectedError;
    };

    const middleware = requirePermission("users", "user", "read");
    const req = { user: { id: 7 } };
    const res = createResponseMock();

    let receivedError = null;
    await middleware(req, res, (error) => {
      receivedError = error;
    });

    assert.equal(receivedError, expectedError);
  });
});
