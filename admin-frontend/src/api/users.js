import apiClient, { mutateWithInvalidation } from "../utils/axios";

export const getUsers = async (filters = {}) => {
  const { data } = await apiClient.get("/admin/users", {
    params: filters,
    cacheMaxAge: 60000, // 1 минута
  });
  return data;
};

export const getUserById = async (id) => {
  const { data } = await apiClient.get(`/admin/users/${id}`, {
    cacheMaxAge: 120000, // 2 минуты
  });
  return data;
};

export const createUser = async (payload) => {
  return mutateWithInvalidation(async () => {
    const { data } = await apiClient.post("/admin/users", payload);
    return data;
  }, /get:\/admin\/users/i);
};

export const updateUser = async (id, payload) => {
  return mutateWithInvalidation(async () => {
    const { data } = await apiClient.patch(`/admin/users/${id}`, payload);
    return data;
  }, /get:\/admin\/users/i);
};

export const deleteUser = async (id) => {
  return mutateWithInvalidation(async () => {
    const { data } = await apiClient.delete(`/admin/users/${id}`);
    return data;
  }, /get:\/admin\/users/i);
};

export const resetPassword = async (id, newPassword) => {
  const { data } = await apiClient.post(`/admin/users/${id}/reset-password`, { newPassword });
  return data;
};

export const getReferences = async () => {
  const { data } = await apiClient.get("/admin/references", {
    cacheMaxAge: 600000, // 10 минут
  });
  return data;
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getReferences,
};
