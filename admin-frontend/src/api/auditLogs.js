import axios from "../utils/axios";

export const getAuditLogs = async (filters = {}) => {
  const response = await axios.get("/admin/audit-logs", { params: filters, cache: false });
  return response.data;
};

export const getAuditLogById = async (id) => {
  const response = await axios.get(`/admin/audit-logs/${id}`, { cache: false });
  return response.data;
};
