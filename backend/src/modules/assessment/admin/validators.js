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
  const rawPage = Number(query?.page);
  const rawLimit = Number(query?.limit);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.trunc(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.trunc(rawLimit), 100) : 20;

  return {
    status: query?.status ? String(query.status).trim() : "",
    branch: query?.branch ? String(query.branch).trim() : "",
    search: query?.search ? String(query.search).trim() : "",
    userRole: user?.role || "",
    userId: user?.id || null,
    page,
    limit,
  };
}

module.exports = {
  parseAssessmentId,
  normalizeListFilters,
};
