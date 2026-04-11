function parseAssessmentId(value) {
  const assessmentId = Number(value);
  if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
    const error = new Error("Некорректный идентификатор аттестации");
    error.status = 400;
    throw error;
  }
  return assessmentId;
}

function normalizeListFilters(query, user) {
  return {
    status: query?.status ? String(query.status).trim() : "",
    branch: query?.branch ? String(query.branch).trim() : "",
    search: query?.search ? String(query.search).trim() : "",
    userRole: user?.role || "",
    userId: user?.id || null,
  };
}

module.exports = {
  parseAssessmentId,
  normalizeListFilters,
};
