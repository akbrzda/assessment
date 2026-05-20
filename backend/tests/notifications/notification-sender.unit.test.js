const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");
const EventEmitter = require("node:events");

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

test("sendOne: успешная отправка меняет статус на sent", async () => {
  const statusUpdates = [];
  const notificationServiceMock = {
    updateStatus: async (...args) => statusUpdates.push(args),
    skip: async () => {},
  };

  const httpsMock = {
    request: (options, callback) => {
      const response = new EventEmitter();
      response.statusCode = 200;

      const req = new EventEmitter();
      req.write = () => {};
      req.end = () => {
        callback(response);
        response.emit("data", JSON.stringify({ ok: true, result: { message_id: 1 } }));
        response.emit("end");
      };
      return req;
    },
  };

  const sender = loadWithMocks(path.resolve(__dirname, "../../src/services/notifications/notificationSender"), {
    https: httpsMock,
    "../../config/env": { botToken: "token" },
    "../../utils/logger": { warn: () => {}, error: () => {} },
    "./notificationService": notificationServiceMock,
    "../../config/database": { pool: { execute: async () => [[], []] } },
  });

  await sender.sendOne({
    id: 15,
    type: "new_course",
    telegram_id: "123456",
    notification_quiet_start: "00:00",
    notification_quiet_end: "00:01",
    timezone: "UTC",
    notifications_enabled: 1,
    payload: { firstName: "Иван", courseTitle: "Курс", courseId: 9 },
  });

  assert.deepEqual(statusUpdates, [[15, "sent"]]);
});

test("sendOne: при 403 помечает blocked и отключает уведомления в users", async () => {
  const statusUpdates = [];
  const dbCalls = [];
  const notificationServiceMock = {
    updateStatus: async (...args) => statusUpdates.push(args),
    skip: async () => {},
  };

  const httpsMock = {
    request: (options, callback) => {
      const response = new EventEmitter();
      response.statusCode = 403;

      const req = new EventEmitter();
      req.write = () => {};
      req.end = () => {
        callback(response);
        response.emit("data", JSON.stringify({ ok: false, error_code: 403, description: "Forbidden" }));
        response.emit("end");
      };
      return req;
    },
  };

  const sender = loadWithMocks(path.resolve(__dirname, "../../src/services/notifications/notificationSender"), {
    https: httpsMock,
    "../../config/env": { botToken: "token" },
    "../../utils/logger": { warn: () => {}, error: () => {} },
    "./notificationService": notificationServiceMock,
    "../../config/database": {
      pool: {
        execute: async (...args) => {
          dbCalls.push(args);
          return [[], []];
        },
      },
    },
  });

  await sender.sendOne({
    id: 22,
    type: "new_course",
    telegram_id: "999",
    notification_quiet_start: "00:00",
    notification_quiet_end: "00:01",
    timezone: "UTC",
    notifications_enabled: 1,
    payload: { firstName: "Анна", courseTitle: "Курс", courseId: 5 },
  });

  assert.equal(statusUpdates.length, 1);
  assert.equal(statusUpdates[0][0], 22);
  assert.equal(statusUpdates[0][1], "blocked");
  assert.equal(dbCalls.length, 1);
});

test("sendOne: добавляет кнопки открытия в Telegram и MAX при наличии BOT_USERNAME и MAX_BOT_NAME", async () => {
  const previousBotUsername = process.env.BOT_USERNAME;
  const previousMaxBotName = process.env.MAX_BOT_NAME;
  process.env.BOT_USERNAME = "tg_test_bot";
  process.env.MAX_BOT_NAME = "max_test_bot";
  delete require.cache[require.resolve("../../src/config/env")];
  delete require.cache[require.resolve("../../src/utils/miniAppLinks")];

  const statusUpdates = [];
  const requests = [];
  const notificationServiceMock = {
    updateStatus: async (...args) => statusUpdates.push(args),
    skip: async () => {},
  };

  const httpsMock = {
    request: (options, callback) => {
      const response = new EventEmitter();
      response.statusCode = 200;

      const req = new EventEmitter();
      req.write = (chunk) => {
        requests.push(JSON.parse(String(chunk || "{}")));
      };
      req.end = () => {
        callback(response);
        response.emit("data", JSON.stringify({ ok: true, result: { message_id: 2 } }));
        response.emit("end");
      };
      return req;
    },
  };

  const sender = loadWithMocks(path.resolve(__dirname, "../../src/services/notifications/notificationSender"), {
    https: httpsMock,
    "../../config/env": { botToken: "token", maxBotName: "max_test_bot" },
    "../../utils/logger": { warn: () => {}, error: () => {} },
    "./notificationService": notificationServiceMock,
    "../../config/database": { pool: { execute: async () => [[], []] } },
  });

  try {
    await sender.sendOne({
      id: 99,
      type: "new_course",
      telegram_id: "321321",
      notification_quiet_start: "00:00",
      notification_quiet_end: "00:01",
      timezone: "UTC",
      notifications_enabled: 1,
      payload: { firstName: "Олег", courseTitle: "Новый курс", courseId: 12 },
    });
  } finally {
    process.env.BOT_USERNAME = previousBotUsername;
    process.env.MAX_BOT_NAME = previousMaxBotName;
  }

  assert.equal(statusUpdates.length, 1);
  assert.equal(statusUpdates[0][0], 99);
  assert.equal(statusUpdates[0][1], "sent");

  assert.equal(requests.length, 1);
  const keyboard = requests[0]?.reply_markup?.inline_keyboard || [];
  assert.equal(keyboard.length, 1);
  assert.equal(keyboard[0].length, 2);
  assert.equal(keyboard[0][0].url, "https://t.me/tg_test_bot/app?startapp=course_12");
  assert.equal(keyboard[0][1].url, "https://max.ru/max_test_bot?startapp=course_12");
});
