import axios, { mutateWithInvalidation } from "../utils/axios";

export const getPositions = async (filters = {}) => {
  const response = await axios.get("/admin/positions", {
    params: filters,
    cacheMaxAge: 300000, // 5 минут
  });
  return response.data;
};

export const getPositionById = async (id) => {
  const response = await axios.get(`/admin/positions/${id}`, {
    cacheMaxAge: 300000, // 5 минут
  });
  return response.data;
};

export const createPosition = async (data) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post("/admin/positions", data);
    return response.data;
  }, /get:\/admin\/positions|get:\/admin\/references/i);
};

export const updatePosition = async (id, data) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.put(`/admin/positions/${id}`, data);
    return response.data;
  }, /get:\/admin\/positions|get:\/admin\/references/i);
};

export const deletePosition = async (id) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.delete(`/admin/positions/${id}`);
    return response.data;
  }, /get:\/admin\/positions|get:\/admin\/references/i);
};
