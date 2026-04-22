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

function assertTopicId(rawTopicId) {
  const topicId = parsePositiveId(rawTopicId);
  if (topicId) {
    return topicId;
  }

  const error = new Error("Некорректный идентификатор темы");
  error.status = 400;
  throw error;
}

function assertCourseTopicParams({ courseId, topicId }) {
  const normalizedCourseId = parsePositiveId(courseId);
  const normalizedTopicId = parsePositiveId(topicId);
  if (normalizedCourseId && normalizedTopicId) {
    return {
      courseId: normalizedCourseId,
      topicId: normalizedTopicId,
    };
  }

  const error = new Error("Некорректные параметры подтемы курса");
  error.status = 400;
  throw error;
}

function assertCourseSectionParams({ courseId, sectionId }) {
  const normalizedCourseId = parsePositiveId(courseId);
  const normalizedSectionId = parsePositiveId(sectionId);
  if (normalizedCourseId && normalizedSectionId) {
    return {
      courseId: normalizedCourseId,
      sectionId: normalizedSectionId,
    };
  }

  const error = new Error("Некорректные параметры темы курса");
  error.status = 400;
  throw error;
}

function assertTopicAttemptParams({ topicId, attemptId }) {
  const normalizedTopicId = parsePositiveId(topicId);
  const normalizedAttemptId = parsePositiveId(attemptId);
  if (normalizedTopicId && normalizedAttemptId) {
    return {
      topicId: normalizedTopicId,
      attemptId: normalizedAttemptId,
    };
  }

  const error = new Error("Некорректные параметры попытки темы");
  error.status = 400;
  throw error;
}

function assertSectionAttemptParams({ sectionId, attemptId }) {
  const normalizedSectionId = parsePositiveId(sectionId);
  const normalizedAttemptId = parsePositiveId(attemptId);
  if (normalizedSectionId && normalizedAttemptId) {
    return {
      sectionId: normalizedSectionId,
      attemptId: normalizedAttemptId,
    };
  }

  const error = new Error("Некорректные параметры попытки раздела");
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
  assertCourseTopicParams,
  assertCourseSectionParams,
  assertTopicId,
  assertTopicAttemptParams,
  assertSectionAttemptParams,
  assertModuleAttemptParams,
  assertFinalAttemptParams,
};
