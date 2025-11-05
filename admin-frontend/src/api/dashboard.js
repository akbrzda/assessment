import apiClient from "../utils/axios";

export default {
  getMetrics() {
    return apiClient.get("/admin/dashboard/metrics");
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
};
