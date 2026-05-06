import apiClient, { mutateWithInvalidation } from "../utils/axios";

export const getRoles = async (params = {}, options = {}) => {
  const { forceFresh = false } = options;
  const { data } = await apiClient.get("/admin/roles", {
    params,
    cache: !forceFresh,
    cacheMaxAge: 60000,
  });
  return data;
};

export const getRoleById = async (roleId, options = {}) => {
  const { forceFresh = false } = options;
  const { data } = await apiClient.get(`/admin/roles/${roleId}`, {
    cache: !forceFresh,
    cacheMaxAge: 60000,
  });
  return data;
};

export const updateRolePermissions = async (roleId, permissions) => {
  return mutateWithInvalidation(async () => {
    const { data } = await apiClient.post(`/admin/roles/${roleId}/permissions`, { permissions });
    return data;
  }, /get:\/admin\/roles/i);
};

export default {
  getRoles,
  getRoleById,
  updateRolePermissions,
};
