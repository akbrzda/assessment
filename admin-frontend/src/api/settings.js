import apiClient from "../utils/axios";

export default {
  // Получить все настройки
  async getSettings() {
    const response = await apiClient.get("/admin/settings");
    return response.data;
  },

  // Получить настройку по ключу
  async getSettingByKey(key) {
    const response = await apiClient.get(`/admin/settings/${key}`);
    return response.data;
  },

  // Создать новую настройку
  async createSetting(data) {
    const response = await apiClient.post("/admin/settings", data);
    return response.data;
  },

  // Обновить настройку
  async updateSetting(key, value) {
    const response = await apiClient.put(`/admin/settings/${key}`, { value });
    return response.data;
  },

  // Удалить настройку
  async deleteSetting(key) {
    const response = await apiClient.delete(`/admin/settings/${key}`);
    return response.data;
  },
};
