import axios from "../utils/axios";

/**
 * Получить список филиалов
 */
export const getBranches = async (filters = {}) => {
  const response = await axios.get("/admin/branches", { params: filters });
  return response.data;
};

/**
 * Получить филиал по ID
 */
export const getBranchById = async (id) => {
  const response = await axios.get(`/admin/branches/${id}`);
  return response.data;
};

/**
 * Создать филиал
 */
export const createBranch = async (data) => {
  const response = await axios.post("/admin/branches", data);
  return response.data;
};

/**
 * Обновить филиал
 */
export const updateBranch = async (id, data) => {
  const response = await axios.put(`/admin/branches/${id}`, data);
  return response.data;
};

/**
 * Удалить филиал
 */
export const deleteBranch = async (id) => {
  const response = await axios.delete(`/admin/branches/${id}`);
  return response.data;
};

/**
 * Получить список управляющих
 */
export const getManagers = async () => {
  const response = await axios.get("/admin/branches/managers/list");
  return response.data;
};

/**
 * Назначить управляющего к филиалу
 */
export const assignManager = async (branchId, userId) => {
  const response = await axios.post(`/admin/branches/${branchId}/managers`, { userId });
  return response.data;
};

/**
 * Удалить управляющего из филиала
 */
export const removeManager = async (branchId, userId) => {
  const response = await axios.delete(`/admin/branches/${branchId}/managers`, { data: { userId } });
  return response.data;
};

/**
 * Массовое назначение управляющего к филиалам
 */
export const assignManagerToBranches = async (userId, branchIds) => {
  const response = await axios.post("/admin/branches/managers/assign-multiple", { userId, branchIds });
  return response.data;
};
