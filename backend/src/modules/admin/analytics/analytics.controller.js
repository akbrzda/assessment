const analyticsService = require("./analytics.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function getOverallStats(req, res, next) {
  try {
    const result = await analyticsService.getOverallStats(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getBranchAnalytics(req, res, next) {
  try {
    const result = await analyticsService.getBranchAnalytics(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getPositionAnalytics(req, res, next) {
  try {
    const result = await analyticsService.getPositionAnalytics(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getTopUsers(req, res, next) {
  try {
    const result = await analyticsService.getTopUsers(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getAssessmentTrends(req, res, next) {
  try {
    const result = await analyticsService.getAssessmentTrends(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getDetailedBranchAnalytics(req, res, next) {
  try {
    const result = await analyticsService.getDetailedBranchAnalytics(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getCombinedAnalytics(req, res, next) {
  try {
    const result = await analyticsService.getCombinedAnalytics(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getAssessmentReport(req, res, next) {
  try {
    const result = await analyticsService.getAssessmentReport(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getUserReport(req, res, next) {
  try {
    const result = await analyticsService.getUserReport(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function exportToExcel(req, res, next) {
  try {
    const result = await analyticsService.exportToExcel(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function exportToPDF(req, res, next) {
  try {
    const result = await analyticsService.exportToPDF(req);
    return sendLegacyResult(res, result);
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
