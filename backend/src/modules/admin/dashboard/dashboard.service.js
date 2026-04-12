const handlers = require("./dashboard.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function getMetrics(req) {
  return runLegacyHandler(handlers.getMetrics, req);
}

async function getActivityTrends(req) {
  return runLegacyHandler(handlers.getActivityTrends, req);
}

async function getBranchKPI(req) {
  return runLegacyHandler(handlers.getBranchKPI, req);
}

async function getLatestAssessmentActivities(req) {
  return runLegacyHandler(handlers.getLatestAssessmentActivities, req);
}

module.exports = {
  getMetrics,
  getActivityTrends,
  getBranchKPI,
  getLatestAssessmentActivities,
};
