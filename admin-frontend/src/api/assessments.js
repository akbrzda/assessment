import axios, { mutateWithInvalidation } from "../utils/axios";

/**
 * Получить список аттестаций
 * @param {Object} filters - фильтры (status, branch, search)
 */
export const getAssessments = async (filters = {}) => {
  const response = await axios.get("/admin/assessments", {
    params: filters,
    cacheMaxAge: 120000, // 2 минуты
  });
  return response.data;
};

/**
 * Получить аттестацию по ID
 * @param {Number} id - ID аттестации
 */
export const getAssessmentById = async (id) => {
  const response = await axios.get(`/admin/assessments/${id}`, {
    cacheMaxAge: 180000, // 3 минуты
  });
  return response.data;
};

/**
 * Создать новую аттестацию
 * @param {Object} data - данные аттестации
 */
export const createAssessment = async (data) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post("/admin/assessments", data);
    return response.data;
  }, /get:\/admin\/assessments/i);
};

/**
 * Обновить аттестацию
 * @param {Number} id - ID аттестации
 * @param {Object} data - данные для обновления
 */
export const updateAssessment = async (id, data) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.put(`/admin/assessments/${id}`, data);
    return response.data;
  }, /get:\/admin\/assessments/i);
};

/**
 * Удалить аттестацию
 * @param {Number} id - ID аттестации
 */
export const deleteAssessment = async (id) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.delete(`/admin/assessments/${id}`);
    return response.data;
  }, /get:\/admin\/assessments/i);
};

/**
 * Получить результаты аттестации
 * @param {Number} id - ID аттестации
 */
export const getAssessmentResults = async (id) => {
  const response = await axios.get(`/admin/assessments/${id}/results`, {
    cacheMaxAge: 60000, // 1 минута
  });
  return response.data;
};

/**
 * Получить детальную информацию об аттестации
 * @param {Number} id - ID аттестации
 */
export const getAssessmentDetails = async (id) => {
  const response = await axios.get(`/admin/assessments/${id}/details`, {
    cacheMaxAge: 180000, // 3 минуты
  });
  return response.data;
};

/**
 * Получить прогресс пользователя по аттестации
 * @param {Number} assessmentId - ID аттестации
 * @param {Number} userId - ID пользователя
 * @param {Number} attemptId - ID попытки
 */
export const getAssessmentUserProgress = async (assessmentId, userId, attemptId = null) => {
  const response = await axios.get(`/admin/assessments/${assessmentId}/users/${userId}/progress`, {
    params: attemptId ? { attemptId } : {},
    cacheMaxAge: 60000, // 1 минута
  });
  return response.data;
};

/**
 * Экспортировать результаты аттестации в Excel
 * @param {Number} id - ID аттестации
 */
export const exportAssessmentToExcel = async (id) => {
  const response = await axios.get(`/admin/assessments/${id}/export`, {
    responseType: "blob",
    cache: false, // Не кешируем бинарные файлы
  });

  // Создать ссылку для скачивания
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `assessment_${id}_${Date.now()}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
