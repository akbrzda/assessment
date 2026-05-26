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

test("notificationService.create возвращает null при активном дубликате", async () => {
  const repositoryMock = {
    findDuplicateActive: async () => ({ id: 10 }),
    insertNotification: async () => {
      throw new Error("insert should not be called");
    },
  };

  const service = loadWithMocks(path.resolve(__dirname, "../../src/services/notifications/notificationService"), {
    "./repository": repositoryMock,
  });

  const result = await service.create({ userId: 1, type: "new_course" });
  assert.equal(result, null);
});

test("notificationService.create сериализует payload и создает уведомление", async () => {
  const calls = [];
  const repositoryMock = {
    findDuplicateActive: async () => null,
    insertNotification: async (payload) => {
      calls.push(payload);
      return 77;
    },
  };

  const service = loadWithMocks(path.resolve(__dirname, "../../src/services/notifications/notificationService"), {
    "./repository": repositoryMock,
  });

  const result = await service.create({
    userId: 2,
    type: "result_passed",
    entityType: "course",
    entityId: 9,
    payload: { score: 95 },
  });

  assert.equal(result, 77);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payloadJson, JSON.stringify({ score: 95 }));
});

test("notificationService.updateStatus blocked отключает уведомления пользователю", async () => {
  const calls = { updateStatus: 0, disable: 0 };
  const repositoryMock = {
    updateStatus: async () => {
      calls.updateStatus += 1;
    },
    findUserIdByNotificationId: async () => 5,
    disableUserNotificationsById: async () => {
      calls.disable += 1;
    },
  };

  const service = loadWithMocks(path.resolve(__dirname, "../../src/services/notifications/notificationService"), {
    "./repository": repositoryMock,
  });

  await service.updateStatus(42, "blocked", { errorMessage: "blocked by telegram" });
  assert.equal(calls.updateStatus, 1);
  assert.equal(calls.disable, 1);
});

test("notificationService.updateStatus sent не вызывает отключение уведомлений", async () => {
  const calls = { disable: 0 };
  const repositoryMock = {
    updateStatus: async () => {},
    findUserIdByNotificationId: async () => 5,
    disableUserNotificationsById: async () => {
      calls.disable += 1;
    },
  };

  const service = loadWithMocks(path.resolve(__dirname, "../../src/services/notifications/notificationService"), {
    "./repository": repositoryMock,
  });

  await service.updateStatus(11, "sent");
  assert.equal(calls.disable, 0);
});

