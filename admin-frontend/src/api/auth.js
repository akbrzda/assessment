import apiClient from "../utils/axios";

export default {
  login(credentials) {
    return apiClient.post("/admin/auth/login", credentials);
  },
  logout() {
    return apiClient.post("/admin/auth/logout");
  },
  refresh() {
    return apiClient.post("/admin/auth/refresh");
  },
};
