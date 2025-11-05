import apiClient from "../utils/axios";

export default {
  // Получить все уровни
  async getLevels() {
    const response = await apiClient.get("/admin/levels");
    return response.data;
  },

  // Получить уровень по номеру
  async getLevelByNumber(levelNumber) {
    const response = await apiClient.get(`/admin/levels/${levelNumber}`);
    return response.data;
  },

  // Создать новый уровень
  async createLevel(data) {
    const response = await apiClient.post("/admin/levels", data);
    return response.data;
  },

  // Обновить уровень
  async updateLevel(levelNumber, data) {
    const response = await apiClient.put(`/admin/levels/${levelNumber}`, data);
    return response.data;
  },

  // Удалить уровень
  async deleteLevel(levelNumber) {
    const response = await apiClient.delete(`/admin/levels/${levelNumber}`);
    return response.data;
  },

  // Пересчитать уровни всех пользователей
  async recalculateLevels() {
    const response = await apiClient.post("/admin/levels/recalculate/all");
    return response.data;
  },

  // Получить статистику по уровням
  async getLevelsStats() {
    const response = await apiClient.get("/admin/levels/stats");
    return response.data;
  },
};
