const moduleService = require("./service");

async function getMetrics(req, res, next) {
  try {
    return await moduleService.getMetrics(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getActivityTrends(req, res, next) {
  try {
    return await moduleService.getActivityTrends(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getBranchKPI(req, res, next) {
  try {
    return await moduleService.getBranchKPI(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getLatestAssessmentActivities(req, res, next) {
  try {
    return await moduleService.getLatestAssessmentActivities(req, res, next);
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


