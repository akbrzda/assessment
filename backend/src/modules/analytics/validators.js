function parseDateParam(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

function buildFilters(req) {
  const from = parseDateParam(req.query.from);
  const to = parseDateParam(req.query.to);
  const branchId = req.query.branchId ? Number(req.query.branchId) || null : null;
  const positionId = req.query.positionId ? Number(req.query.positionId) || null : null;
  const managerBranchId =
    req.currentUser?.roleName === "manager"
      ? Number(req.currentUser.branchId) || null
      : null;
  return { from, to, branchId, positionId, managerBranchId };
}

function parseSortBy(value) {
  return value || "score";
}

function parseLimit(value, defaultValue) {
  return value ? Number(value) || defaultValue : defaultValue;
}

function parseExportParams(query) {
  return {
    format: query.format || "excel",
    reportType: query.type || "employees",
  };
}

module.exports = {
  buildFilters,
  parseSortBy,
  parseLimit,
  parseExportParams,
};
