import axios from "../utils/axios";

/**
 * Получить общую статистику
 */
export const getOverallStats = async (filters = {}) => {
  const response = await axios.get("/admin/analytics/overall", { params: filters });
  return response.data;
};

/**
 * Получить аналитику по филиалам
 */
export const getBranchAnalytics = async (filters = {}) => {
  const response = await axios.get("/admin/analytics/branches", { params: filters });
  return response.data;
};

/**
 * Получить аналитику по должностям
 */
export const getPositionAnalytics = async (filters = {}) => {
  const response = await axios.get("/admin/analytics/positions", { params: filters });
  return response.data;
};

/**
 * Получить топ сотрудников
 */
export const getTopUsers = async (filters = {}) => {
  const response = await axios.get("/admin/analytics/top-users", { params: filters });
  return response.data;
};

/**
 * Получить динамику по датам
 */
export const getAssessmentTrends = async (filters = {}) => {
  const response = await axios.get("/admin/analytics/trends", { params: filters });
  return response.data;
};

/**
 * Экспорт в Excel
 */
export const exportToExcel = async (type, filters = {}) => {
  const response = await axios.get("/admin/analytics/export/excel", {
    params: { type, ...filters },
    responseType: "blob",
  });

  // Создать ссылку для скачивания
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `report_${type}_${Date.now()}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Экспорт в PDF
 */
export const exportToPDF = async (type, filters = {}) => {
  const response = await axios.get("/admin/analytics/export/pdf", {
    params: { type, ...filters },
    responseType: "blob",
  });

  // Создать ссылку для скачивания
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `report_${type}_${Date.now()}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Получить детальную аналитику по филиалам
 */
export const getDetailedBranchAnalytics = async (filters = {}) => {
  const response = await axios.get("/admin/analytics/branches/detailed", { params: filters });
  return response.data;
};

/**
 * Получить комбинированную аналитику (филиалы + должности)
 */
export const getCombinedAnalytics = async (filters = {}) => {
  const response = await axios.get("/admin/analytics/combined", { params: filters });
  return response.data;
};

/**
 * Получить отчёт по конкретной аттестации
 */
export const getAssessmentReport = async (assessmentId) => {
  const response = await axios.get(`/admin/analytics/assessment/${assessmentId}`);
  return response.data;
};

/**
 * Получить отчёт по конкретному пользователю
 */
export const getUserReport = async (userId, filters = {}) => {
  const response = await axios.get(`/admin/analytics/user/${userId}`, { params: filters });
  return response.data;
};
