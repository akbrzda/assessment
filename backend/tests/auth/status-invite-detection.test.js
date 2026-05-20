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

test("getStatus: startapp=course_* не считается invite-кодом", async () => {
  const authService = loadWithMocks(path.resolve(__dirname, "../../src/modules/auth/public/service"), {
    "./repository": {
      getDashboardData: async () => null,
      findActiveInvitationByCode: async () => null,
    },
    "../../../config/env": { superAdminIds: [] },
    "../../../services/auditService": {
      buildAuditEntry: (payload) => payload,
      logAuditEvent: async () => {},
    },
  });

  const result = await authService.getStatus({
    currentUser: null,
    telegramUser: { first_name: "Max", last_name: "User" },
    inviteCodeHeader: null,
    startParam: null,
    startApp: "course_123",
    startParamHash: null,
  });

  assert.equal(result.inviteFlow.hasInviteCode, false);
  assert.equal(result.inviteFlow.inviteCodeValid, false);
});

