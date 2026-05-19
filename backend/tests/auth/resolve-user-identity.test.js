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

test("resolveUser: сначала ищет по platform identity", async () => {
  const calls = [];
  const userModelMock = {
    findByPlatformIdentity: async (platform, platformUserId) => {
      calls.push(["findByPlatformIdentity", platform, platformUserId]);
      return {
        id: 5,
        telegramId: "123",
        roleId: 2,
        roleName: "employee",
        branchId: 1,
        positionId: 3,
        level: 1,
        points: 0,
        firstName: "Иван",
        lastName: "Петров",
        avatarUrl: null,
      };
    },
    findByTelegramId: async () => {
      calls.push(["findByTelegramId"]);
      return null;
    },
    updateAvatar: async () => {},
  };

  const resolveUser = loadWithMocks(path.resolve(__dirname, "../../src/middleware/resolveUser"), {
    "../models/userModel": userModelMock,
  });

  const req = {
    telegramInitData: {
      user: { id: 123, photo_url: null },
    },
  };

  await new Promise((resolve, reject) => {
    resolveUser(req, {}, (error) => {
      if (error) return reject(error);
      return resolve();
    });
  });

  assert.equal(req.currentUser.id, 5);
  assert.equal(calls[0][0], "findByPlatformIdentity");
  assert.equal(calls.some((item) => item[0] === "findByTelegramId"), false);
});
