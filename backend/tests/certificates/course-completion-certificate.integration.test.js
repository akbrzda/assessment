const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");
const appEvents = require("../../src/events/appEvents");

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

test("attempt.completed при passed=true и certificate_enabled создает сертификат и уведомление", async () => {
  const createCalls = [];
  const sendOneCalls = [];
  const certificateCalls = [];

  const poolMock = {
    execute: async (sql, params = []) => {
      const query = String(sql);

      if (query.includes("FROM courses WHERE final_assessment_id")) {
        return [[{ id: 21, title: "Food Safety" }]];
      }
      if (query.includes("FROM users WHERE id = ?")) {
        return [[{ id: 7, first_name: "Alex", last_name: "Doe" }]];
      }
      if (query.includes("FROM bot_notifications bn")) {
        return [[{ id: 900, user_id: 7, type: "result_passed", payload: "{}" }]];
      }
      if (query.includes("SELECT certificate_enabled FROM courses")) {
        return [[{ certificate_enabled: 1 }]];
      }

      throw new Error(`Unexpected SQL in test: ${query} :: ${JSON.stringify(params)}`);
    },
  };

  const notificationServiceMock = {
    create: async (payload) => {
      createCalls.push(payload);
      return createCalls.length === 1 ? 900 : 901;
    },
  };

  const notificationSenderMock = {
    sendOne: async (row) => {
      sendOneCalls.push(row);
    },
  };

  const certificateServiceMock = {
    generateCertificate: async (...args) => {
      certificateCalls.push(args);
      return { status: "issued", uuid: "cert-uuid-1" };
    },
  };

  const assessmentEvents = loadWithMocks(path.resolve(__dirname, "../../src/events/assessmentEvents"), {
    "../config/database": { pool: poolMock },
    "../services/notifications/notificationService": notificationServiceMock,
    "../services/notifications/notificationSender": notificationSenderMock,
    "../services/certificates/certificateService": certificateServiceMock,
    "../utils/logger": { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} },
  });

  assessmentEvents.registerAssessmentEvents();

  appEvents.emit("attempt.completed", {
    userId: 7,
    assessmentId: 1001,
    attemptId: 55,
    attemptNumber: 1,
    scorePercent: 96,
    passScorePercent: 70,
    passed: true,
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(sendOneCalls.length, 1);
  assert.equal(certificateCalls.length, 1);
  assert.equal(createCalls.length, 2);
  assert.equal(createCalls[1].type, "certificate_ready");
  assert.equal(createCalls[1].payload.uuid, "cert-uuid-1");

  appEvents.removeAllListeners("attempt.completed");
});

