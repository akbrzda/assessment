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

test("audit: пишет событие invite.phone_verification.failed при несовпадении телефона", async () => {
  const events = [];
  const repository = {
    findUserByPlatformIdentity: async () => null,
    findActiveInvitationByCode: async () => ({
      id: 31,
      code: "invite-audit",
      phone: "+79990000000",
      invited_user_id: 300,
      created_by: 1,
      first_name: "Иван",
      last_name: "Петров",
    }),
    markPhoneVerificationRejected: async () => {},
  };

  const authService = loadWithMocks(path.resolve(__dirname, "../../src/modules/auth/public/service"), {
    "./repository": repository,
    "../../../config/env": { superAdminIds: [] },
    "../../../services/auditService": {
      buildAuditEntry: (payload) => payload,
      logAuditEvent: async (entry) => {
        events.push(entry.action);
      },
    },
  });

  await assert.rejects(
    () =>
      authService.register(
        {
          currentUser: null,
          telegramUser: { id: 11, username: "tg-user" },
          inviteCodeHeader: null,
          startParam: null,
          startApp: null,
          startParamHash: null,
          clientPlatform: "telegram",
        },
        {
          firstName: "Иван",
          lastName: "Петров",
          inviteCode: "invite-audit",
          contact: {
            source: "telegram_contact",
            userId: 11,
            phoneNumber: "+7 999 111 22 33",
          },
        },
      ),
  );

  assert.ok(events.includes("invite.phone_verification.failed"));
});

test("audit: пишет событие identity.auto_link.succeeded при успешном auto-link", async () => {
  const events = [];
  const repository = {
    findUserByPlatformIdentity: async () => null,
    findActiveInvitationByCode: async () => ({
      id: 32,
      code: "invite-audit-ok",
      phone: "+79991112233",
      invited_user_id: 301,
      created_by: 1,
      first_name: "Иван",
      last_name: "Петров",
    }),
    findVerifiedActiveUsersByPhoneE164: async () => [{ id: 88 }],
    upsertPlatformIdentity: async () => {},
    markInvitationUsed: async () => 1,
    getDashboardData: async () => ({ id: 88, roleName: "employee", firstName: "Иван", lastName: "Петров", branchName: "Филиал" }),
  };

  const authService = loadWithMocks(path.resolve(__dirname, "../../src/modules/auth/public/service"), {
    "./repository": repository,
    "../../../config/env": { superAdminIds: [] },
    "../../../services/auditService": {
      buildAuditEntry: (payload) => payload,
      logAuditEvent: async (entry) => {
        events.push(entry.action);
      },
    },
  });

  const result = await authService.register(
    {
      currentUser: null,
      telegramUser: { id: 22, username: "max-user" },
      inviteCodeHeader: null,
      startParam: null,
      startApp: null,
      startParamHash: null,
      clientPlatform: "max",
    },
    {
      firstName: "Иван",
      lastName: "Петров",
      inviteCode: "invite-audit-ok",
      contact: {
        source: "max_contact",
        userId: 22,
        phoneNumber: "+7 999 111 22 33",
      },
    },
  );

  assert.equal(result.registered, true);
  assert.ok(events.includes("identity.auto_link.succeeded"));
});
