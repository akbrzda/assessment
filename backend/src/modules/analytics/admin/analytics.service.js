const handlers = require("./analytics.handlers.js");

async function getOverallStats(req, res, next) {
  return handlers.getOverallStats(req, res, next);
}

async function getBranchAnalytics(req, res, next) {
  return handlers.getBranchAnalytics(req, res, next);
}

async function getPositionAnalytics(req, res, next) {
  return handlers.getPositionAnalytics(req, res, next);
}

async function getTopUsers(req, res, next) {
  return handlers.getTopUsers(req, res, next);
}

async function getAssessmentTrends(req, res, next) {
  return handlers.getAssessmentTrends(req, res, next);
}

async function getDetailedBranchAnalytics(req, res, next) {
  return handlers.getDetailedBranchAnalytics(req, res, next);
}

async function getCombinedAnalytics(req, res, next) {
  return handlers.getCombinedAnalytics(req, res, next);
}

async function getAssessmentReport(req, res, next) {
  return handlers.getAssessmentReport(req, res, next);
}

async function getUserReport(req, res, next) {
  return handlers.getUserReport(req, res, next);
}

async function exportToExcel(req, res, next) {
  return handlers.exportToExcel(req, res, next);
}

async function exportToPDF(req, res, next) {
  return handlers.exportToPDF(req, res, next);
}

module.exports = {
  getOverallStats,
  getBranchAnalytics,
  getPositionAnalytics,
  getTopUsers,
  getAssessmentTrends,
  getDetailedBranchAnalytics,
  getCombinedAnalytics,
  getAssessmentReport,
  getUserReport,
  exportToExcel,
  exportToPDF,
};
