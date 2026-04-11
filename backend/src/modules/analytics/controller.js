const analyticsService = require("./service");
const {
  buildFilters,
  parseSortBy,
  parseLimit,
  parseExportParams,
} = require("./validators");

async function getSummary(req, res, next) {
  try {
    const filters = buildFilters(req);
    const payload = await analyticsService.getSummary(filters);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

async function getBranchReport(req, res, next) {
  try {
    const filters = buildFilters(req);
    const payload = await analyticsService.getBranchReport(filters);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

async function getEmployeeReport(req, res, next) {
  try {
    const filters = buildFilters(req);
    const sortBy = parseSortBy(req.query.sortBy);
    const limit = parseLimit(req.query.limit, 20);
    const payload = await analyticsService.getEmployeeReport({
      filters,
      sortBy,
      limit,
    });
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

async function exportReport(req, res, next) {
  try {
    const filters = buildFilters(req);
    const sortBy = parseSortBy(req.query.sortBy);
    const limit = parseLimit(req.query.limit, 100);
    const { format, reportType } = parseExportParams(req.query);

    const { buffer, mimeType, filename } = await analyticsService.exportReport({
      filters,
      reportType,
      format,
      sortBy,
      limit,
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
