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

  getLatestAssessmentActivities(params) {
    return apiClient.get("/admin/dashboard/latest-assessment-activities", { params });
  },
  getObservability() {
    return apiClient.get("/admin/dashboard/observability");
  },
  getFailureReasons(params) {
    return apiClient.get("/admin/analytics/failure-reasons", { params });
  },
};
