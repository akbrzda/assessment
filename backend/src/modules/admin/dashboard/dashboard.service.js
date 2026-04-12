const handlers = require("./dashboard.handlers.js");

async function getMetrics(req, res, next) {
  return handlers.getMetrics(req, res, next);
}

async function getActivityTrends(req, res, next) {
  return handlers.getActivityTrends(req, res, next);
}

async function getBranchKPI(req, res, next) {
  return handlers.getBranchKPI(req, res, next);
}

async function getLatestAssessmentActivities(req, res, next) {
  return handlers.getLatestAssessmentActivities(req, res, next);
}

module.exports = {
  getMetrics,
  getActivityTrends,
  getBranchKPI,
  getLatestAssessmentActivities,
};
