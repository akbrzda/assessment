function parsePositiveInteger(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
}

function normalizeLeaderboardFilters(query = {}) {
  const branchId = parsePositiveInteger(query.branchId);
  const positionId = parsePositiveInteger(query.positionId);

  const rawLimit = query.limit == null ? 30 : Number(query.limit);
  const normalizedLimit = Number.isFinite(rawLimit) ? rawLimit : 30;
  const limit = Math.max(1, Math.min(Math.trunc(normalizedLimit), 100));

  return {
    branchId,
    positionId,
    limit,
  };
}

module.exports = {
  normalizeLeaderboardFilters,
};
