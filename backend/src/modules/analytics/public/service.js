const { createAnalyticsReport } = require("../../../services/exportService");
const analyticsRepository = require("./repository");

async function getSummary(filters) {
  const [summary, branches, positions] = await Promise.all([
    analyticsRepository.getSummary(filters),
    analyticsRepository.getBranches(),
    analyticsRepository.getPositions(),
  ]);

  return {
    summary,
    filters: {
      branches: branches.map((branch) => ({
        id: Number(branch.id),
        name: branch.name,
      })),
      positions: positions.map((position) => ({
        id: Number(position.id),
        name: position.name,
      })),
    },
  };
}

async function getBranchReport(filters) {
  const branches = await analyticsRepository.getBranchBreakdown(filters);
  return { branches };
}

async function getEmployeeReport({ filters, sortBy, limit }) {
  const employees = await analyticsRepository.getEmployeePerformance({
    ...filters,
    sortBy,
    limit,
  });

  return { employees };
}

async function exportReport({ filters, reportType, format, sortBy, limit }) {
  let data;
  if (reportType === "branches") {
    data = await analyticsRepository.getBranchBreakdown(filters);
  } else {
    data = await analyticsRepository.getEmployeePerformance({
      ...filters,
      sortBy,
      limit,
    });
  }

  return createAnalyticsReport({
    data,
    reportType,
    format,
    filters,
  });
}

module.exports = {
  getSummary,
  getBranchReport,
  getEmployeeReport,
  exportReport,
};

