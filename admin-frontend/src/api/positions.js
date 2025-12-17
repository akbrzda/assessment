import axios from "../utils/axios";

export const getPositions = async (filters = {}) => {
  const response = await axios.get("/admin/positions", { params: filters });
  return response.data;
};

export const getPositionById = async (id) => {
  const response = await axios.get(`/admin/positions/${id}`);
  return response.data;
};

export const createPosition = async (data) => {
  const response = await axios.post("/admin/positions", data);
  return response.data;
};

export const updatePosition = async (id, data) => {
  const response = await axios.put(`/admin/positions/${id}`, data);
  return response.data;
};

export const deletePosition = async (id) => {
  const response = await axios.delete(`/admin/positions/${id}`);
  return response.data;
};
