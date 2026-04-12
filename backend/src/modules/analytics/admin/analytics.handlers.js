const adminAnalyticsController = require("../../../controllers/adminAnalyticsController");

module.exports = {
  getOverallStats: adminAnalyticsController.getOverallStats,
  getBranchAnalytics: adminAnalyticsController.getBranchAnalytics,
  getPositionAnalytics: adminAnalyticsController.getPositionAnalytics,
  getTopUsers: adminAnalyticsController.getTopUsers,
  getAssessmentTrends: adminAnalyticsController.getAssessmentTrends,
  getDetailedBranchAnalytics: adminAnalyticsController.getDetailedBranchAnalytics,
  getCombinedAnalytics: adminAnalyticsController.getCombinedAnalytics,
  getAssessmentReport: adminAnalyticsController.getAssessmentReport,
  getUserReport: adminAnalyticsController.getUserReport,
  exportToExcel: adminAnalyticsController.exportToExcel,
  exportToPDF: adminAnalyticsController.exportToPDF,
};
