import apiClient from "../utils/axios";

export const getUsers = async (filters = {}) => {
  const { data } = await apiClient.get("/admin/users", { params: filters });
  return data;
};

export const getUserById = async (id) => {
  const { data } = await apiClient.get(`/admin/users/${id}`);
  return data;
};

export const createUser = async (payload) => {
  const { data } = await apiClient.post("/admin/users", payload);
  return data;
};

export const updateUser = async (id, payload) => {
  const { data } = await apiClient.patch(`/admin/users/${id}`, payload);
  return data;
};

export const deleteUser = async (id) => {
  const { data } = await apiClient.delete(`/admin/users/${id}`);
  return data;
};

export const resetPassword = async (id, newPassword) => {
  const { data } = await apiClient.post(`/admin/users/${id}/reset-password`, { newPassword });
  return data;
};

export const getReferences = async () => {
  const { data } = await apiClient.get("/admin/references");
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
