import axios, { mutateWithInvalidation } from "../utils/axios";

/**
 * Получить список филиалов
 */
export const getBranches = async (filters = {}) => {
  const response = await axios.get("/admin/branches", {
    params: filters,
    cacheMaxAge: 300000, // 5 минут
  });
  return response.data;
};

/**
 * Получить филиал по ID
 */
export const getBranchById = async (id) => {
  const response = await axios.get(`/admin/branches/${id}`, {
    cacheMaxAge: 300000, // 5 минут
  });
  return response.data;
};

/**
 * Создать филиал
 */
export const createBranch = async (data) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post("/admin/branches", data);
    return response.data;
  }, /get:\/admin\/branches|get:\/admin\/references/i);
};

/**
 * Обновить филиал
 */
export const updateBranch = async (id, data) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.put(`/admin/branches/${id}`, data);
    return response.data;
  }, /get:\/admin\/branches|get:\/admin\/references/i);
};

/**
 * Удалить филиал
 */
export const deleteBranch = async (id) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.delete(`/admin/branches/${id}`);
    return response.data;
  }, /get:\/admin\/branches|get:\/admin\/references/i);
};

/**
 * Получить список управляющих
 */
export const getManagers = async () => {
  const response = await axios.get("/admin/branches/managers/list", {
    cacheMaxAge: 300000, // 5 минут
  });
  return response.data;
};

/**
 * Назначить управляющего к филиалу
 */
export const assignManager = async (branchId, userId) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post(`/admin/branches/${branchId}/managers`, { userId });
    return response.data;
  }, /get:\/admin\/branches/i);
};

/**
 * Удалить управляющего из филиала
 */
export const removeManager = async (branchId, userId) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.delete(`/admin/branches/${branchId}/managers`, { data: { userId } });
    return response.data;
  }, /get:\/admin\/branches/i);
};

/**
 * Массовое назначение управляющего к филиалам
 */
export const assignManagerToBranches = async (userId, branchIds) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post("/admin/branches/managers/assign-multiple", { userId, branchIds });
    return response.data;
  }, /get:\/admin\/branches|get:\/admin\/references/i);
};
