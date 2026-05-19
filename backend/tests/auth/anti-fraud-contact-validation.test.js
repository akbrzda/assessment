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

function createRepository() {
  return {
    findUserByPlatformIdentity: async () => null,
    findActiveInvitationByCode: async () => ({
      id: 9,
      code: "invite-fraud",
      phone: "+79994443322",
      invited_user_id: 190,
      created_by: 1,
      branch_id: 1,
      position_id: 1,
      first_name: "Иван",
      last_name: "Петров",
    }),
    findVerifiedActiveUsersByPhoneE164: async () => [],
    markPhoneVerificationRejected: async () => {},
  };
}

async function registerWithContact(contact) {
  const authService = loadWithMocks(path.resolve(__dirname, "../../src/modules/auth/public/service"), {
    "./repository": createRepository(),
    "../../../config/env": { superAdminIds: [] },
    "../../../services/auditService": {
      buildAuditEntry: (payload) => payload,
      logAuditEvent: async () => {},
    },
  });

  return authService.register(
    {
      currentUser: null,
      telegramUser: { id: 111, username: "tg-user" },
      inviteCodeHeader: null,
      startParam: null,
      startApp: null,
      startParamHash: null,
      clientPlatform: "telegram",
    },
    {
      firstName: "Иван",
      lastName: "Петров",
      inviteCode: "invite-fraud",
      contact,
    },
  );
}

test("антифрод: источник контакта должен соответствовать платформе", async () => {
  await assert.rejects(
    () =>
      registerWithContact({
        source: "max_contact",
        userId: 111,
        phoneNumber: "+7 999 444 33 22",
      }),
    (error) => {
      assert.equal(error.status, 422);
      return true;
    },
  );
});

test("антифрод: contact.userId должен совпадать с пользователем платформы", async () => {
  await assert.rejects(
    () =>
      registerWithContact({
        source: "telegram_contact",
        userId: 999999,
        phoneNumber: "+7 999 444 33 22",
      }),
    (error) => {
      assert.equal(error.status, 403);
      return true;
    },
  );
});
