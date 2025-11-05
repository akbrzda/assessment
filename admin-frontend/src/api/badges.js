import apiClient from "../utils/axios";

export default {
  // Получить все бейджи
  async getBadges() {
    const response = await apiClient.get("/admin/badges");
    return response.data;
  },

  // Получить бейдж по ID
  async getBadgeById(id) {
    const response = await apiClient.get(`/admin/badges/${id}`);
    return response.data;
  },

  // Создать новый бейдж
  async createBadge(data) {
    const response = await apiClient.post("/admin/badges", data);
    return response.data;
  },

  // Обновить бейдж
  async updateBadge(id, data) {
    const response = await apiClient.put(`/admin/badges/${id}`, data);
    return response.data;
  },

  // Загрузить иконку для бейджа
  async uploadBadgeIcon(id, file) {
    const formData = new FormData();
    formData.append("icon", file);
    const response = await apiClient.post(`/admin/badges/${id}/upload-icon`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Удалить бейдж
  async deleteBadge(id) {
    const response = await apiClient.delete(`/admin/badges/${id}`);
    return response.data;
  },

  // Изменить порядок бейджей
  async reorderBadges(badges) {
    const response = await apiClient.put("/admin/badges/reorder/all", { badges });
    return response.data;
  },
};
