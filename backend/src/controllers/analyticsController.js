const analyticsModel = require("../models/analyticsModel");
const referenceModel = require("../models/referenceModel");
const { createAnalyticsReport } = require("../services/exportService");

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
  const managerBranchId = req.currentUser?.roleName === "manager" ? Number(req.currentUser.branchId) || null : null;
  return { from, to, branchId, positionId, managerBranchId };
}

async function getSummary(req, res, next) {
  try {
    const filters = buildFilters(req);
    const summary = await analyticsModel.getSummary(filters);
    const [branches, positions] = await Promise.all([referenceModel.getBranches(), referenceModel.getPositions()]);
    res.json({
      summary,
      filters: {
        branches: branches.map((branch) => ({ id: Number(branch.id), name: branch.name })),
        positions: positions.map((position) => ({ id: Number(position.id), name: position.name })),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getBranchReport(req, res, next) {
  try {
    const filters = buildFilters(req);
    const branches = await analyticsModel.getBranchBreakdown(filters);
    res.json({ branches });
  } catch (error) {
    next(error);
  }
}

async function getEmployeeReport(req, res, next) {
  try {
    const filters = buildFilters(req);
    const sortBy = req.query.sortBy || "score";
    const limit = req.query.limit ? Number(req.query.limit) || 20 : 20;
    const items = await analyticsModel.getEmployeePerformance({
      ...filters,
      sortBy,
      limit,
    });
    res.json({ employees: items });
  } catch (error) {
    next(error);
  }
}

async function exportReport(req, res, next) {
  try {
    const filters = buildFilters(req);
    const format = req.query.format || "excel";
    const reportType = req.query.type || "employees";

    let data;
    if (reportType === "branches") {
      data = await analyticsModel.getBranchBreakdown(filters);
    } else {
      const sortBy = req.query.sortBy || "score";
      const limit = req.query.limit ? Number(req.query.limit) || 100 : 100;
      data = await analyticsModel.getEmployeePerformance({
        ...filters,
        sortBy,
        limit,
      });
    }

    const { buffer, mimeType, filename } = await createAnalyticsReport({
      data,
      reportType,
      format,
      filters,
    });

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSummary,
  getBranchReport,
  getEmployeeReport,
  exportReport,
};
