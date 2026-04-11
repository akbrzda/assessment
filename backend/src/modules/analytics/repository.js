const analyticsModel = require("../../models/analyticsModel");
const referenceModel = require("../../models/referenceModel");

async function getSummary(filters) {
  return analyticsModel.getSummary(filters);
}

async function getBranchBreakdown(filters) {
  return analyticsModel.getBranchBreakdown(filters);
}

async function getEmployeePerformance(filters) {
  return analyticsModel.getEmployeePerformance(filters);
}

async function getBranches() {
  return referenceModel.getBranches();
}

async function getPositions() {
  return referenceModel.getPositions();
}

module.exports = {
  getSummary,
  getBranchBreakdown,
  getEmployeePerformance,
  getBranches,
  getPositions,
};
