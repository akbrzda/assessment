import axios, { mutateWithInvalidation } from "../utils/axios";

export const getCourses = async (filters = {}) => {
  const response = await axios.get("/admin/courses", {
    params: filters,
    cacheMaxAge: 60000,
  });
  return response.data;
};

export const getCourseById = async (id) => {
  const response = await axios.get(`/admin/courses/${id}`, {
    cacheMaxAge: 30000,
  });
  return response.data;
};

export const createCourse = async (payload) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post("/admin/courses", payload);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const updateCourse = async (id, payload) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.patch(`/admin/courses/${id}`, payload);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const deleteCourse = async (id) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.delete(`/admin/courses/${id}`);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const publishCourse = async (id) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post(`/admin/courses/${id}/publish`);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const archiveCourse = async (id) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post(`/admin/courses/${id}/archive`);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const createCourseModule = async (courseId, payload) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post(`/admin/courses/${courseId}/modules`, payload);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const updateCourseModule = async (moduleId, payload) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.patch(`/admin/courses/modules/${moduleId}`, payload);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const deleteCourseModule = async (moduleId) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.delete(`/admin/courses/modules/${moduleId}`);
    return response.data;
  }, /get:\/admin\/courses/i);
};

