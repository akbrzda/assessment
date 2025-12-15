import apiClient from "../utils/axios";

export default {
  getMetrics(params) {
    return apiClient.get("/admin/dashboard/metrics", { params });
  },
  getActivityTrends(params) {
    return apiClient.get("/admin/dashboard/activity-trends", { params });
  },
  getBranchKPI(params) {
    return apiClient.get("/admin/dashboard/branch-kpi", { params });
  },
  getRecentActions(params) {
    return apiClient.get("/admin/dashboard/recent-actions", { params });
  },
  getLatestAssessmentActivities(params) {
    return apiClient.get("/admin/dashboard/latest-assessment-activities", { params });
  },
};
