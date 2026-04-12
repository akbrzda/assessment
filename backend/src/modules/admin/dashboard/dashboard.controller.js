const dashboardService = require("./dashboard.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function getMetrics(req, res, next) {
  try {
    const result = await dashboardService.getMetrics(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getActivityTrends(req, res, next) {
  try {
    const result = await dashboardService.getActivityTrends(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getBranchKPI(req, res, next) {
  try {
    const result = await dashboardService.getBranchKPI(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getLatestAssessmentActivities(req, res, next) {
  try {
    const result = await dashboardService.getLatestAssessmentActivities(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMetrics,
  getActivityTrends,
  getBranchKPI,
  getLatestAssessmentActivities,
};
