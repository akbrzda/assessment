const analyticsService = require("./service");

async function getOverallStats(req, res, next) {
  try {
    return await analyticsService.getOverallStats(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getBranchAnalytics(req, res, next) {
  try {
    return await analyticsService.getBranchAnalytics(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getPositionAnalytics(req, res, next) {
  try {
    return await analyticsService.getPositionAnalytics(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getTopUsers(req, res, next) {
  try {
    return await analyticsService.getTopUsers(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getAssessmentTrends(req, res, next) {
  try {
    return await analyticsService.getAssessmentTrends(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getDetailedBranchAnalytics(req, res, next) {
  try {
    return await analyticsService.getDetailedBranchAnalytics(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getCombinedAnalytics(req, res, next) {
  try {
    return await analyticsService.getCombinedAnalytics(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getAssessmentReport(req, res, next) {
  try {
    return await analyticsService.getAssessmentReport(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserReport(req, res, next) {
  try {
    return await analyticsService.getUserReport(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function exportToExcel(req, res, next) {
  try {
    return await analyticsService.exportToExcel(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function exportToPDF(req, res, next) {
  try {
    return await analyticsService.exportToPDF(req, res, next);
  } catch (error) {
    next(error);
  }
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


