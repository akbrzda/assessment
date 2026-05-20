const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

function loadWithMocks(targetPath, mocks) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve(targetPath)];
    return require(targetPath);
  } finally {
    Module._load = originalLoad;
  }
}

function createBaseRepository(overrides = {}) {
  return {
    findUserByPlatformIdentity: async () => null,
    findVerifiedActiveUsersByPhoneE164: async () => [],
    upsertPlatformIdentity: async () => {},
    getDashboardData: async () => ({
      id: 101,
      roleName: "employee",
      firstName: "Иван",
      lastName: "Петров",
      branchName: "Филиал",
      telegramId: "tg101",
    }),
    ...overrides,
  };
}

function createContext() {
  return {
    currentUser: null,
    telegramUser: {
      id: 8100,
      username: "max.second.platform",
      first_name: "Max",
      last_name: "User",
    },
    inviteCodeHeader: null,
    startParam: null,
    startApp: null,
    startParamHash: null,
    clientPlatform: "max",
  };
}

function createPayload() {
  return {
    firstName: "Иван",
    lastName: "Петров",
    contact: {
      source: "max_contact",
      userId: 8100,
      phoneNumber: "+7 (999) 111-22-33",
    },
  };
}

test("register: без invite делает auto-link к существующему профилю по подтвержденному телефону", async () => {
  const calls = {
    upsert: null,
  };
  const repository = createBaseRepository({
    findVerifiedActiveUsersByPhoneE164: async () => [{ id: 501 }],
    upsertPlatformIdentity: async (payload) => {
      calls.upsert = payload;
    },
    getDashboardData: async () => ({
      id: 501,
      roleName: "employee",
      firstName: "Связанный",
      lastName: "Профиль",
      branchName: "Филиал",
      telegramId: "tg501",
    }),
  });

  const authService = loadWithMocks(path.resolve(__dirname, "../../src/modules/auth/public/service"), {
    "./repository": repository,
    "../../../config/env": { superAdminIds: [] },
    "../../../services/auditService": {
      buildAuditEntry: (payload) => payload,
      logAuditEvent: async () => {},
    },
  });

  const result = await authService.register(createContext(), createPayload());

  assert.equal(result.registered, true);
  assert.equal(result.user.id, 501);
  assert.equal(calls.upsert.userId, 501);
  assert.equal(calls.upsert.platform, "max");
});

test("register: без invite возвращает 409 при конфликте профилей по телефону", async () => {
  const repository = createBaseRepository({
    findVerifiedActiveUsersByPhoneE164: async () => [{ id: 501 }, { id: 777 }],
  });

  const authService = loadWithMocks(path.resolve(__dirname, "../../src/modules/auth/public/service"), {
    "./repository": repository,
    "../../../config/env": { superAdminIds: [] },
    "../../../services/auditService": {
      buildAuditEntry: (payload) => payload,
      logAuditEvent: async () => {},
    },
  });

  await assert.rejects(() => authService.register(createContext(), createPayload()), (error) => {
    assert.equal(error.status, 409);
    assert.match(error.message, /конфликт профилей/i);
    return true;
  });
});

test("register: без invite возвращает 403 если профиль по телефону не найден", async () => {
  const repository = createBaseRepository({
    findVerifiedActiveUsersByPhoneE164: async () => [],
  });

  const authService = loadWithMocks(path.resolve(__dirname, "../../src/modules/auth/public/service"), {
    "./repository": repository,
    "../../../config/env": { superAdminIds: [] },
    "../../../services/auditService": {
      buildAuditEntry: (payload) => payload,
      logAuditEvent: async () => {},
    },
  });

  await assert.rejects(() => authService.register(createContext(), createPayload()), (error) => {
    assert.equal(error.status, 403);
    assert.match(error.message, /нужна ссылка-приглашение/i);
    return true;
  });
});

test("register: без invite возвращает 422 если контакт не передан", async () => {
  const repository = createBaseRepository();

  const authService = loadWithMocks(path.resolve(__dirname, "../../src/modules/auth/public/service"), {
    "./repository": repository,
    "../../../config/env": { superAdminIds: [] },
    "../../../services/auditService": {
      buildAuditEntry: (payload) => payload,
      logAuditEvent: async () => {},
    },
  });

  await assert.rejects(
    () =>
      authService.register(createContext(), {
        firstName: "Иван",
        lastName: "Петров",
      }),
    (error) => {
      assert.equal(error.status, 422);
      assert.match(error.message, /подтвердите номер телефона/i);
      return true;
    },
  );
});
