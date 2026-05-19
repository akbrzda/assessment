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
    findActiveInvitationByCode: async () => ({
      id: 11,
      code: "invite-1",
      phone: "+79995556677",
      invited_user_id: 100,
      branch_id: 1,
      position_id: 2,
      created_by: 5,
      first_name: "Иван",
      last_name: "Петров",
    }),
    findVerifiedActiveUsersByPhoneE164: async () => [],
    activatePendingUser: async () => 1,
    markPhoneVerified: async () => {},
    markPhoneVerificationRejected: async () => {},
    upsertPlatformIdentity: async () => {},
    completeOnboarding: async () => {},
    assignUserToMatchingAssessments: async () => {},
    markInvitationUsed: async () => 1,
    getDashboardData: async (userId) => ({
      id: userId,
      roleName: "employee",
      firstName: "Иван",
      lastName: "Петров",
      branchName: "Филиал",
      telegramId: "123",
    }),
    ...overrides,
  };
}

function createContext() {
  return {
    currentUser: null,
    telegramUser: {
      id: 7001,
      username: "max.user",
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
    inviteCode: "invite-1",
    contact: {
      source: "max_contact",
      userId: 7001,
      phoneNumber: "+7 (999) 555-66-77",
    },
  };
}

test("register: auto-link привязывает новую платформу к существующему профилю по подтвержденному телефону", async () => {
  const calls = {
    upsertIdentityUserId: null,
    markUsedUserId: null,
    activated: false,
  };
  const repository = createBaseRepository({
    findVerifiedActiveUsersByPhoneE164: async () => [{ id: 55 }],
    upsertPlatformIdentity: async (payload) => {
      calls.upsertIdentityUserId = payload.userId;
    },
    markInvitationUsed: async (_invitationId, userId) => {
      calls.markUsedUserId = userId;
      return 1;
    },
    activatePendingUser: async () => {
      calls.activated = true;
      return 1;
    },
    getDashboardData: async () => ({
      id: 55,
      roleName: "employee",
      firstName: "Связанный",
      lastName: "Профиль",
      branchName: "Филиал",
      telegramId: "tg55",
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
  assert.equal(result.user.id, 55);
  assert.equal(calls.upsertIdentityUserId, 55);
  assert.equal(calls.markUsedUserId, 55);
  assert.equal(calls.activated, false);
});

test("register: auto-link возвращает конфликт при нескольких профилях с одним подтвержденным телефоном", async () => {
  const repository = createBaseRepository({
    findVerifiedActiveUsersByPhoneE164: async () => [{ id: 55 }, { id: 77 }],
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

test("register: защищается от гонки при повторной активации pending-профиля", async () => {
  const repository = createBaseRepository({
    activatePendingUser: async () => 0,
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
    assert.match(error.message, /другом сеансе/i);
    return true;
  });
});
