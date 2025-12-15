import apiClient from "../utils/axios";

export default {
  // Получить список всех правил
  list() {
    return apiClient.get("/admin/gamification/rules");
  },

  // Получить правило по ID
  getById(id) {
    return apiClient.get(`/admin/gamification/rules/${id}`);
  },

  // Создать новое правило
  create(ruleData) {
    return apiClient.post("/admin/gamification/rules", ruleData);
  },

  // Обновить правило
  update(id, ruleData) {
    return apiClient.put(`/admin/gamification/rules/${id}`, ruleData);
  },

  // Удалить правило
  delete(id) {
    return apiClient.delete(`/admin/gamification/rules/${id}`);
  },

  // Симуляция начисления очков (dry-run)
  dryRun(testData) {
    return apiClient.post("/admin/gamification/rules/dry-run", testData);
  },
};
