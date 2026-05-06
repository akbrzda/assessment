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

test("generateCertificate: возвращает существующий issued сертификат без повторной генерации", async () => {
  const repositoryMock = {
    create: async () => ({ id: 1, uuid: "issued-uuid", status: "issued" }),
    saveSnapshot: async () => {},
    updateStatus: async () => {},
  };
  const generatorMock = {
    generatePng: async () => {
      throw new Error("Генератор не должен вызываться");
    },
  };

  const certificateService = loadWithMocks(path.resolve(__dirname, "../../src/services/certificates/certificateService"), {
    "../../modules/certificates/repository": repositoryMock,
    "./pdfGenerator": generatorMock,
    "../../utils/logger": { debug: () => {}, info: () => {}, error: () => {} },
  });

  const result = await certificateService.generateCertificate(10, 20, 30, {
    firstName: "Иван",
    lastName: "Петров",
    courseTitle: "Безопасность",
    scorePercent: 95,
  });

  assert.equal(result.uuid, "issued-uuid");
  assert.equal(result.status, "issued");
});

test("generateCertificate: при успешной генерации сохраняет snapshot и статус issued", async () => {
  const repositoryCalls = {
    saveSnapshot: [],
    updateStatus: [],
  };
  const repositoryMock = {
    create: async () => ({ id: 5, uuid: "new-uuid", status: "pending", user_id: 42 }),
    saveSnapshot: async (...args) => repositoryCalls.saveSnapshot.push(args),
    updateStatus: async (...args) => repositoryCalls.updateStatus.push(args),
  };
  const generatorMock = {
    generatePng: async () => ({ filePath: "/tmp/cert.png", fileName: "cert.png" }),
  };

  const certificateService = loadWithMocks(path.resolve(__dirname, "../../src/services/certificates/certificateService"), {
    "../../modules/certificates/repository": repositoryMock,
    "./pdfGenerator": generatorMock,
    "../../utils/logger": { debug: () => {}, info: () => {}, error: () => {} },
  });

  const result = await certificateService.generateCertificate(10, 20, null, {
    firstName: "Иван",
    lastName: "Петров",
    courseTitle: "JS",
    scorePercent: 88,
  });

  assert.equal(result.status, "issued");
  assert.equal(repositoryCalls.saveSnapshot.length, 1);
  assert.equal(repositoryCalls.updateStatus.length, 1);
  assert.equal(repositoryCalls.updateStatus[0][0], 5);
  assert.equal(repositoryCalls.updateStatus[0][1].status, "issued");
});

test("generateCertificate: при ошибке генератора помечает generation_failed и возвращает null", async () => {
  const repositoryCalls = {
    updateStatus: [],
  };
  const repositoryMock = {
    create: async () => ({ id: 7, uuid: "bad-uuid", status: "pending", user_id: 77 }),
    saveSnapshot: async () => {},
    updateStatus: async (...args) => repositoryCalls.updateStatus.push(args),
  };
  const generatorMock = {
    generatePng: async () => {
      throw new Error("Ошибка рендера");
    },
  };

  const certificateService = loadWithMocks(path.resolve(__dirname, "../../src/services/certificates/certificateService"), {
    "../../modules/certificates/repository": repositoryMock,
    "./pdfGenerator": generatorMock,
    "../../utils/logger": { debug: () => {}, info: () => {}, error: () => {} },
  });

  const result = await certificateService.generateCertificate(10, 20, null, {
    firstName: "Иван",
    lastName: "Петров",
    courseTitle: "Node",
    scorePercent: 70,
  });

  assert.equal(result, null);
  assert.equal(repositoryCalls.updateStatus.length, 1);
  assert.equal(repositoryCalls.updateStatus[0][0], 7);
  assert.equal(repositoryCalls.updateStatus[0][1].status, "generation_failed");
});
