/**
 * Чистые функции бизнес-логики для модуля курсов.
 * Не имеют побочных эффектов и не зависят от БД — легко тестируются.
 */

/**
 * Определяет статус темы после просмотра материала.
 * - Нет теста → тема завершена сразу
 * - Есть тест → переходит в in_progress до сдачи теста
 * @param {boolean} hasMaterial
 * @param {number|null} assessmentId
 * @returns {'completed'|'in_progress'}
 */
function topicStatusAfterMaterialView(hasMaterial, assessmentId) {
  if (!hasMaterial) {
    const error = new Error("У данной темы нет теоретического материала");
    error.status = 422;
    throw error;
  }
  return assessmentId ? "in_progress" : "completed";
}

/**
 * Определяет статус темы после завершения попытки теста.
 * @param {boolean} passed
 * @returns {'completed'|'failed'}
 */
function topicStatusAfterAttempt(passed) {
  return passed ? "completed" : "failed";
}

/**
 * Определяет статус раздела после завершения попытки теста раздела.
 * @param {boolean} passed
 * @returns {'passed'|'failed'}
 */
function sectionStatusAfterAttempt(passed) {
  return passed ? "passed" : "failed";
}

/**
 * Вычисляет процент прогресса курса на основе обязательных разделов.
 * @param {number} passedRequired — сколько обязательных разделов сдано
 * @param {number} totalRequired — всего обязательных разделов
 * @returns {number} — 0..100 с точностью до сотых
 */
function calculateProgressPercent(passedRequired, totalRequired) {
  if (!totalRequired || totalRequired <= 0) return 0;
  return Number(((passedRequired / totalRequired) * 100).toFixed(2));
}

/**
 * Проверяет, что все темы раздела завершены.
 * @param {Array<{status: string}>} topicProgresses — массив статусов тем
 * @returns {{ allCompleted: boolean, completed: number, total: number }}
 */
function checkAllTopicsCompleted(topicProgresses) {
  const total = topicProgresses.length;
  const completed = topicProgresses.filter((t) => t.status === "completed").length;
  return { total, completed, allCompleted: total === 0 || total === completed };
}

/**
 * Проверяет, заблокирован ли раздел (предыдущий обязательный раздел не сдан).
 * @param {Array<{isRequired: boolean, userStatus: string}>} prevSections — предыдущие разделы
 * @returns {boolean}
 */
function isSectionLocked(prevSections) {
  return prevSections.some((s) => s.isRequired && (s.userStatus || "not_started") !== "passed");
}

/**
 * Проверяет, заблокирована ли тема (предыдущая тема не завершена).
 * @param {{status: string}|null} prevTopicProgress — прогресс предыдущей темы или null
 * @returns {boolean}
 */
function isTopicLocked(prevTopicProgress) {
  if (!prevTopicProgress) return false;
  return (prevTopicProgress.status || "not_started") !== "completed";
}

module.exports = {
  topicStatusAfterMaterialView,
  topicStatusAfterAttempt,
  sectionStatusAfterAttempt,
  calculateProgressPercent,
  checkAllTopicsCompleted,
  isSectionLocked,
  isTopicLocked,
};
