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

test("verifyInitData: для max использует x-max-init-data и ставит clientPlatform=max", async () => {
  const calls = {
    max: [],
    telegram: [],
  };

  const middleware = loadWithMocks(path.resolve(__dirname, "../../src/middleware/verifyInitData"), {
    "../services/telegramAuthService": {
      validateInitData: () => {
        calls.telegram.push(true);
        return null;
      },
    },
    "../services/maxAuthService": {
      validateInitData: (value) => {
        calls.max.push(value);
        return {
          auth_date: "1",
          user: { id: 777 },
        };
      },
    },
    "../config/env": {
      telegramInitDataBypass: false,
      maxInitDataBypass: false,
    },
  });

  const req = {
    headers: {
      "x-client-platform": "max",
      "x-max-init-data": "signed-max-data",
    },
    body: {},
  };

  await new Promise((resolve, reject) => {
    middleware(req, {}, (error) => {
      if (error) return reject(error);
      return resolve();
    });
  });

  assert.equal(calls.max.length, 1);
  assert.equal(calls.max[0], "signed-max-data");
  assert.equal(calls.telegram.length, 0);
  assert.equal(req.clientPlatform, "max");
  assert.equal(req.platformInitData.user.id, 777);
});
