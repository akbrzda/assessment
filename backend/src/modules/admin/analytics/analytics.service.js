const handlers = require("./analytics.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function getOverallStats(req) {
  return runLegacyHandler(handlers.getOverallStats, req);
}

async function getBranchAnalytics(req) {
  return runLegacyHandler(handlers.getBranchAnalytics, req);
}

async function getPositionAnalytics(req) {
  return runLegacyHandler(handlers.getPositionAnalytics, req);
}

async function getTopUsers(req) {
  return runLegacyHandler(handlers.getTopUsers, req);
}

async function getAssessmentTrends(req) {
  return runLegacyHandler(handlers.getAssessmentTrends, req);
}

async function getDetailedBranchAnalytics(req) {
  return runLegacyHandler(handlers.getDetailedBranchAnalytics, req);
}

async function getCombinedAnalytics(req) {
  return runLegacyHandler(handlers.getCombinedAnalytics, req);
}

async function getAssessmentReport(req) {
  return runLegacyHandler(handlers.getAssessmentReport, req);
}

async function getUserReport(req) {
  return runLegacyHandler(handlers.getUserReport, req);
}

async function exportToExcel(req) {
  return runLegacyHandler(handlers.exportToExcel, req);
}

async function exportToPDF(req) {
  return runLegacyHandler(handlers.exportToPDF, req);
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
