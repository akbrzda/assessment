const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
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

function buildSignedInitData({ token, userId, authDate }) {
  const user = JSON.stringify({ id: userId, first_name: "Иван", username: "ivan" });
  const payload = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "query-1",
    start_param: "invite_abc",
    user,
  });

  const dataCheckString = Array.from(payload.entries())
    .sort(([aKey], [bKey]) => aKey.localeCompare(bKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  payload.append("hash", hash);
  return payload.toString();
}

test("validateInitData: валидный MAX initData проходит проверку", () => {
  const targetPath = path.resolve(__dirname, "../../src/services/maxAuthService");
  const token = "max-test-token";
  const now = Math.floor(Date.now() / 1000);

  const { validateInitData } = loadWithMocks(targetPath, {
    "../config/env": { maxBotToken: token },
    "../utils/logger": { warn: () => {} },
  });

  const initData = buildSignedInitData({ token, userId: 1001, authDate: now });
  const payload = validateInitData(initData);

  assert.equal(payload.user.id, 1001);
  assert.equal(payload.start_param, "invite_abc");
});

test("validateInitData: просроченный auth_date отклоняется", () => {
  const targetPath = path.resolve(__dirname, "../../src/services/maxAuthService");
  const token = "max-test-token";
  const oldAuthDate = Math.floor(Date.now() / 1000) - 25 * 60 * 60;

  const { validateInitData } = loadWithMocks(targetPath, {
    "../config/env": { maxBotToken: token },
    "../utils/logger": { warn: () => {} },
  });

  const initData = buildSignedInitData({ token, userId: 1001, authDate: oldAuthDate });
  const payload = validateInitData(initData);

  assert.equal(payload, null);
});

test("validateInitData: URL-encoded MAX initData проходит проверку", () => {
  const targetPath = path.resolve(__dirname, "../../src/services/maxAuthService");
  const token = "max-test-token";
  const now = Math.floor(Date.now() / 1000);

  const { validateInitData } = loadWithMocks(targetPath, {
    "../config/env": { maxBotToken: token },
    "../utils/logger": { warn: () => {} },
  });

  const initData = buildSignedInitData({ token, userId: 1002, authDate: now });
  const encodedInitData = encodeURIComponent(initData);
  const payload = validateInitData(encodedInitData);

  assert.equal(payload.user.id, 1002);
  assert.equal(payload.start_param, "invite_abc");
});
