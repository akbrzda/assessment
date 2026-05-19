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

test("register: в invite-flow сохраняет telegram identity через upsertPlatformIdentity", async () => {
  const calls = {
    upsertPlatformIdentity: [],
  };

  const repositoryMock = {
    findUserByPlatformIdentity: async () => null,
    findUserByTelegramId: async () => null,
    findActiveInvitationByCode: async () => ({
      id: 15,
      code: "invite-abc",
      role_id: 3,
      branch_id: 10,
      position_id: 20,
      phone: "+79991112233",
      invited_user_id: 99,
      created_by: 7,
    }),
    activatePendingUser: async () => 1,
    markPhoneVerified: async () => {},
    markPhoneVerificationRejected: async () => {},
    findVerifiedActiveUsersByPhoneE164: async () => [],
    upsertPlatformIdentity: async (payload) => {
      calls.upsertPlatformIdentity.push(payload);
    },
    completeOnboarding: async () => {},
    assignUserToMatchingAssessments: async () => {},
    markInvitationUsed: async () => 1,
    getDashboardData: async () => ({
      id: 99,
      roleName: "employee",
      firstName: "Иван",
      lastName: "Петров",
      branchName: "Филиал",
      telegramId: "123456",
    }),
  };

  const authService = loadWithMocks(path.resolve(__dirname, "../../src/modules/auth/public/service"), {
    "./repository": repositoryMock,
    "../../../config/env": { superAdminIds: [] },
    "../../../services/auditService": {
      buildAuditEntry: (payload) => payload,
      logAuditEvent: async () => {},
    },
  });

  const result = await authService.register(
    {
      currentUser: null,
      telegramUser: {
        id: 123456,
        first_name: "Ivan",
        last_name: "Petrov",
        username: "ivan.petrov",
        photo_url: "https://example.com/avatar.png",
      },
      inviteCodeHeader: null,
      startParam: null,
      startApp: null,
      startParamHash: null,
      clientPlatform: "telegram",
    },
    {
      firstName: "Иван",
      lastName: "Петров",
      inviteCode: "invite-abc",
      contact: {
        source: "telegram_contact",
        userId: 123456,
        phoneNumber: "+7 (999) 111-22-33",
      },
    },
  );

  assert.equal(result.registered, true);
  assert.equal(calls.upsertPlatformIdentity.length, 1);
  assert.deepEqual(calls.upsertPlatformIdentity[0], {
    userId: 99,
    platform: "telegram",
    platformUserId: "123456",
    platformUsername: "ivan.petrov",
    isVerified: true,
    verifiedAt: calls.upsertPlatformIdentity[0].verifiedAt,
  });
  assert.equal(calls.upsertPlatformIdentity[0].verifiedAt instanceof Date, true);
});
