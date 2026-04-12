function parsePositiveId(rawValue) {
  const parsedValue = Number(rawValue);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function ensureAssessmentId(rawValue) {
  const assessmentId = parsePositiveId(rawValue);
  if (assessmentId) {
    return assessmentId;
  }

  const error = new Error("Некорректный идентификатор аттестации");
  error.status = 400;
  throw error;
}

function ensureAttemptId(rawValue) {
  const attemptId = parsePositiveId(rawValue);
  if (attemptId) {
    return attemptId;
  }

  const error = new Error("Некорректный идентификатор попытки");
  error.status = 400;
  throw error;
}

module.exports = {
  ensureAssessmentId,
  ensureAttemptId,
};
