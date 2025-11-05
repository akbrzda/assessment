import apiClient from "../utils/axios";

export default {
  // Получить логи с фильтрами
  async getLogs(params = {}) {
    const response = await apiClient.get("/admin/logs", { params });
    return response.data;
  },

  // Получить статистику по логам
  async getLogsStats() {
    const response = await apiClient.get("/admin/logs/stats");
    return response.data;
  },

  // Получить список типов действий
  async getActionTypes() {
    const response = await apiClient.get("/admin/logs/action-types");
    return response.data;
  },

  // Получить список типов сущностей
  async getEntityTypes() {
    const response = await apiClient.get("/admin/logs/entity-types");
    return response.data;
  },

  // Экспорт логов в Excel
  async exportLogs(params = {}) {
    const response = await apiClient.get("/admin/logs/export", {
      params,
      responseType: "blob",
    });
    return response.data;
  },

  // Отправить логи в Telegram
  async sendLogsToTelegram(data) {
    const response = await apiClient.post("/admin/logs/send-to-telegram", data);
    return response.data;
  },
};
