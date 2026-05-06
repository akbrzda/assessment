const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.TEST_API_BASE || "http://localhost:3001/api";

async function apiRequest(method, path, token, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    status: response.status,
    body: payload,
  };
}

describe("E2E roles-permissions", () => {
  it("Create/Update role: обновление прав роли проходит успешно", async (t) => {
    const token = process.env.TEST_ADMIN_TOKEN;
    const roleId = process.env.TEST_ROLE_ID;
    const permissionId = process.env.TEST_PERMISSION_ID;

    if (!token || !roleId || !permissionId) {
      t.skip("Пропуск: нужны TEST_ADMIN_TOKEN, TEST_ROLE_ID, TEST_PERMISSION_ID");
      return;
    }

    const result = await apiRequest("POST", `/admin/roles/${roleId}/permissions`, token, {
      permissions: [
        {
          permissionId: Number(permissionId),
          effect: "allow",
          conditions: null,
          expiresAt: null,
        },
      ],
    });

    assert.equal(result.status, 200);
    assert.equal(Number(result.body.role.id), Number(roleId));
    assert.equal(Array.isArray(result.body.permissions), true);
  });

  it("Assign/Remove role: роль назначается и удаляется у пользователя", async (t) => {
    const token = process.env.TEST_ADMIN_TOKEN;
    const userId = process.env.TEST_USER_ID;
    const roleId = process.env.TEST_ROLE_ID;

    if (!token || !userId || !roleId) {
      t.skip("Пропуск: нужны TEST_ADMIN_TOKEN, TEST_USER_ID, TEST_ROLE_ID");
      return;
    }

    const assignResult = await apiRequest("POST", `/admin/users/${userId}/roles`, token, {
      roleId: Number(roleId),
      expiresAt: null,
    });

    assert.equal(assignResult.status, 200);
    assert.equal(Number(assignResult.body.user.id), Number(userId));

    const removeResult = await apiRequest("DELETE", `/admin/users/${userId}/roles/${roleId}`, token);
    assert.ok([204, 404].includes(removeResult.status));
  });

  it("Set override: override для пользователя сохраняется", async (t) => {
    const token = process.env.TEST_ADMIN_TOKEN;
    const userId = process.env.TEST_USER_ID;
    const permissionId = process.env.TEST_PERMISSION_ID;

    if (!token || !userId || !permissionId) {
      t.skip("Пропуск: нужны TEST_ADMIN_TOKEN, TEST_USER_ID, TEST_PERMISSION_ID");
      return;
    }

    const result = await apiRequest("POST", `/admin/users/${userId}/permissions/override`, token, {
      permissionId: Number(permissionId),
      effect: "deny",
      reason: "E2E проверка",
      expiresAt: null,
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.message, "Переопределение права сохранено");
  });
});
