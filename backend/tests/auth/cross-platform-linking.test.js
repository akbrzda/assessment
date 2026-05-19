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
      id: 20,
      code: "invite-cross",
      phone: "+79990001122",
      invited_user_id: 200,
      branch_id: 10,
      position_id: 12,
      created_by: 1,
      first_name: "Иван",
      last_name: "Петров",
    }),
    findVerifiedActiveUsersByPhoneE164: async () => [{ id: 77 }],
    upsertPlatformIdentity: async () => {},
    markInvitationUsed: async () => 1,
    getDashboardData: async () => ({
      id: 77,
      roleName: "employee",
      firstName: "Иван",
      lastName: "Петров",
      branchName: "Филиал",
    }),
    activatePendingUser: async () => 1,
    markPhoneVerified: async () => {},
    markPhoneVerificationRejected: async () => {},
    completeOnboarding: async () => {},
    assignUserToMatchingAssessments: async () => {},
    ...overrides,
  };
}

async function runCase({ platform, source, userId }) {
  const calls = { upserts: [] };
  const repository = createBaseRepository({
    upsertPlatformIdentity: async (payload) => {
      calls.upserts.push(payload);
    },
  });

  const authService = loadWithMocks(path.resolve(__dirname, "../../src/modules/auth/public/service"), {
    "./repository": repository,
    "../../../config/env": { superAdminIds: [] },
    "../../../services/auditService": {
      buildAuditEntry: (payload) => payload,
      logAuditEvent: async () => {},
    },
  });

  const result = await authService.register(
    {
      currentUser: null,
      telegramUser: { id: userId, username: `${platform}-user` },
      inviteCodeHeader: null,
      startParam: null,
      startApp: null,
      startParamHash: null,
      clientPlatform: platform,
    },
    {
      firstName: "Иван",
      lastName: "Петров",
      inviteCode: "invite-cross",
      contact: {
        source,
        userId,
        phoneNumber: "+7 (999) 000-11-22",
      },
    },
  );

  return { result, calls };
}

test("cross-platform: Telegram пользователь линкуется к существующему профилю по телефону", async () => {
  const { result, calls } = await runCase({
    platform: "telegram",
    source: "telegram_contact",
    userId: 5001,
  });

  assert.equal(result.registered, true);
  assert.equal(result.user.id, 77);
  assert.equal(calls.upserts[0].platform, "telegram");
  assert.equal(calls.upserts[0].platformUserId, "5001");
});

test("cross-platform: MAX пользователь линкуется к существующему профилю по телефону", async () => {
  const { result, calls } = await runCase({
    platform: "max",
    source: "max_contact",
    userId: 7001,
  });

  assert.equal(result.registered, true);
  assert.equal(result.user.id, 77);
  assert.equal(calls.upserts[0].platform, "max");
  assert.equal(calls.upserts[0].platformUserId, "7001");
});
