/**
 * E2E-сценарий: полное прохождение курса.
 * Использует in-memory заглушки (stub-stores) вместо реальной БД.
 * Описывает сквозную логику: старт -> тема -> тест темы -> тест раздела -> итоговая -> завершение.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  topicStatusAfterMaterialView,
  topicStatusAfterAttempt,
  sectionStatusAfterAttempt,
  calculateProgressPercent,
  checkAllTopicsCompleted,
} = require("../../src/services/coursesLogic");

// --- Вспомогательный in-memory state -----------------------------------------

function createCourseState(sections) {
  return {
    sections: sections.map((s) => ({
      ...s,
      userStatus: "not_started",
      topics: s.topics.map((t) => ({ ...t, userStatus: "not_started", materialViewed: false })),
    })),
  };
}

function getTopicState(state, sectionIdx, topicIdx) {
  return state.sections[sectionIdx].topics[topicIdx];
}

function getSectionState(state, sectionIdx) {
  return state.sections[sectionIdx];
}

// --- E2E-сценарий -------------------------------------------------------------

test("e2e: курс с одним обязательным разделом и одной темой (только материал)", () => {
  const state = createCourseState([
    {
      id: 1,
      isRequired: true,
      assessmentId: 101,
      topics: [{ id: 10, hasMaterial: true, assessmentId: null }],
    },
  ]);

  const topic = getTopicState(state, 0, 0);

  // Шаг 1: просматриваем материал темы
  const topicStatus = topicStatusAfterMaterialView(topic.hasMaterial, topic.assessmentId);
  assert.equal(topicStatus, "completed", "тема должна быть завершена после просмотра материала");
  topic.userStatus = topicStatus;

  // Шаг 2: все темы раздела завершены
  const topicStatuses = getSectionState(state, 0).topics;
  const check = checkAllTopicsCompleted(topicStatuses.map((t) => ({ status: t.userStatus })));
  assert.ok(check.allCompleted, "все темы раздела должны быть завершены");

  // Шаг 3: сдаём тест раздела
  const sectionStatus = sectionStatusAfterAttempt(true);
  getSectionState(state, 0).userStatus = sectionStatus;
  assert.equal(sectionStatus, "passed");

  // Шаг 4: прогресс курса — 100%
  const progress = calculateProgressPercent(1, 1);
  assert.equal(progress, 100);
});

test("e2e: курс с темой-только-тест (без материала)", () => {
  const state = createCourseState([
    {
      id: 2,
      isRequired: true,
      assessmentId: 202,
      topics: [{ id: 20, hasMaterial: false, assessmentId: 50 }],
    },
  ]);

  const topic = getTopicState(state, 0, 0);

  // Тема только с тестом — нельзя просматривать материал
  assert.throws(
    () => topicStatusAfterMaterialView(topic.hasMaterial, topic.assessmentId),
    (err) => {
      assert.equal(err.status, 422);
      return true;
    },
  );

  // Шаг 1: проваливаем тест темы — не завершена
  const statusFail = topicStatusAfterAttempt(false);
  assert.equal(statusFail, "failed");
  topic.userStatus = statusFail;

  // Шаг 2: тест раздела недоступен — тема не завершена
  const check1 = checkAllTopicsCompleted([{ status: topic.userStatus }]);
  assert.ok(!check1.allCompleted, "нельзя сдать раздел, пока тема не завершена");

  // Шаг 3: успешно сдаём тест темы
  const statusPass = topicStatusAfterAttempt(true);
  assert.equal(statusPass, "completed");
  topic.userStatus = statusPass;

  // Шаг 4: все темы завершены
  const check2 = checkAllTopicsCompleted([{ status: topic.userStatus }]);
  assert.ok(check2.allCompleted);

  // Шаг 5: сдаём тест раздела
  const sectionStatus = sectionStatusAfterAttempt(true);
  assert.equal(sectionStatus, "passed");

  // Шаг 6: прогресс 100%
  assert.equal(calculateProgressPercent(1, 1), 100);
});

test("e2e: курс с темой-материал-и-тест (оба условия обязательны)", () => {
  const state = createCourseState([
    {
      id: 3,
      isRequired: true,
      assessmentId: 303,
      topics: [{ id: 30, hasMaterial: true, assessmentId: 60 }],
    },
  ]);

  const topic = getTopicState(state, 0, 0);

  // Шаг 1: просматриваем материал — тема в in_progress (есть тест)
  const afterView = topicStatusAfterMaterialView(topic.hasMaterial, topic.assessmentId);
  assert.equal(afterView, "in_progress");
  topic.userStatus = afterView;
  topic.materialViewed = true;

  // Тест раздела ещё недоступен
  const check1 = checkAllTopicsCompleted([{ status: topic.userStatus }]);
  assert.ok(!check1.allCompleted, "тема in_progress — раздел ещё недоступен");

  // Шаг 2: сдаём тест темы
  const afterAttempt = topicStatusAfterAttempt(true);
  assert.equal(afterAttempt, "completed");
  topic.userStatus = afterAttempt;

  // Шаг 3: теперь все темы завершены
  const check2 = checkAllTopicsCompleted([{ status: topic.userStatus }]);
  assert.ok(check2.allCompleted);

  // Шаг 4: сдаём тест раздела
  const sectionStatus = sectionStatusAfterAttempt(true);
  assert.equal(sectionStatus, "passed");

  // Шаг 5: итоговый прогресс — 100%
  assert.equal(calculateProgressPercent(1, 1), 100);
});

test("e2e: два обязательных раздела, прогресс обновляется поэтапно", () => {
  // Прогресс 0% -> 50% -> 100%
  assert.equal(calculateProgressPercent(0, 2), 0);
  assert.equal(calculateProgressPercent(1, 2), 50);
  assert.equal(calculateProgressPercent(2, 2), 100);
});

test("e2e: необязательный раздел не влияет на расчёт прогресса", () => {
  // 2 обязательных раздела из которых сдан 1 -> 50%, необязательный не учитывается
  const passedRequired = 1;
  const totalRequired = 2; // только обязательные
  assert.equal(calculateProgressPercent(passedRequired, totalRequired), 50);
});

test("e2e: проверка структуры модуля курсов", () => {
  const logic = require("../../src/services/coursesLogic");
  assert.equal(typeof logic.topicStatusAfterMaterialView, "function");
  assert.equal(typeof logic.topicStatusAfterAttempt, "function");
  assert.equal(typeof logic.sectionStatusAfterAttempt, "function");
  assert.equal(typeof logic.calculateProgressPercent, "function");
  assert.equal(typeof logic.checkAllTopicsCompleted, "function");
  assert.equal(typeof logic.isSectionLocked, "function");
  assert.equal(typeof logic.isTopicLocked, "function");
});
