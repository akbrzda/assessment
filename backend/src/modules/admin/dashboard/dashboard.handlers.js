const adminDashboardController = require("../../../controllers/adminDashboardController");

module.exports = {
  getMetrics: adminDashboardController.getMetrics,
  getActivityTrends: adminDashboardController.getActivityTrends,
  getBranchKPI: adminDashboardController.getBranchKPI,
  getLatestAssessmentActivities: adminDashboardController.getLatestAssessmentActivities,
};
