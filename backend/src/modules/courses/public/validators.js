function parsePositiveId(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : 0;
}

function assertCourseId(rawCourseId) {
  const courseId = parsePositiveId(rawCourseId);
  if (courseId) {
    return courseId;
  }

  const error = new Error("Некорректный идентификатор курса");
  error.status = 400;
  throw error;
}

function assertModuleAttemptParams({ moduleId, attemptId }) {
  const normalizedModuleId = parsePositiveId(moduleId);
  const normalizedAttemptId = parsePositiveId(attemptId);
  if (normalizedModuleId && normalizedAttemptId) {
    return {
      moduleId: normalizedModuleId,
      attemptId: normalizedAttemptId,
    };
  }

  const error = new Error("Некорректные параметры попытки модуля");
  error.status = 400;
  throw error;
}

function assertFinalAttemptParams({ courseId, attemptId }) {
  const normalizedCourseId = parsePositiveId(courseId);
  const normalizedAttemptId = parsePositiveId(attemptId);
  if (normalizedCourseId && normalizedAttemptId) {
    return {
      courseId: normalizedCourseId,
      attemptId: normalizedAttemptId,
    };
  }

  const error = new Error("Некорректные параметры итоговой попытки");
  error.status = 400;
  throw error;
}

module.exports = {
  assertCourseId,
  assertModuleAttemptParams,
  assertFinalAttemptParams,
};
