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

export const getCoursePreview = async (id) => {
  const response = await axios.get(`/admin/courses/${id}/preview`, {
    cacheMaxAge: 10000,
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

export const uploadCourseCover = async (id, file) => {
  const formData = new FormData();
  formData.append("cover", file);

  return mutateWithInvalidation(async () => {
    const response = await axios.post(`/admin/courses/${id}/upload-cover`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const uploadCourseMedia = async (file, mediaType) => {
  const formData = new FormData();
  formData.append("media", file);
  if (mediaType) {
    formData.append("mediaType", mediaType);
  }

  return mutateWithInvalidation(async () => {
    const response = await axios.post("/admin/courses/upload-media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
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

// ─── Разделы ─────────────────────────────────────────────────────────────────

export const createCourseSection = async (courseId, payload) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post(`/admin/courses/${courseId}/sections`, payload);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const updateCourseSection = async (sectionId, payload) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.patch(`/admin/courses/sections/${sectionId}`, payload);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const reorderCourseSections = async (courseId, sectionIds) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.patch(`/admin/courses/${courseId}/sections/reorder`, { sectionIds });
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const deleteCourseSection = async (sectionId) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.delete(`/admin/courses/sections/${sectionId}`);
    return response.data;
  }, /get:\/admin\/courses/i);
};

// ─── Темы ─────────────────────────────────────────────────────────────────────

export const createCourseTopic = async (sectionId, payload) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post(`/admin/courses/sections/${sectionId}/topics`, payload);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const updateCourseTopic = async (topicId, payload) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.patch(`/admin/courses/topics/${topicId}`, payload);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const reorderCourseTopics = async (courseId, sectionId, topicIds) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.patch(`/admin/courses/${courseId}/sections/${sectionId}/topics/reorder`, { topicIds });
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const deleteCourseTopic = async (topicId) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.delete(`/admin/courses/topics/${topicId}`);
    return response.data;
  }, /get:\/admin\/courses/i);
};

// ─── Назначения: должности и филиалы ────────────────────────────────────────

export const getCourseTargets = async (courseId) => {
  const response = await axios.get(`/admin/courses/${courseId}/targets`, { cacheMaxAge: 10000 });
  return response.data;
};

export const updateCourseTargets = async (courseId, payload) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.put(`/admin/courses/${courseId}/targets`, payload);
    return response.data;
  }, /get:\/admin\/courses/i);
};

// ─── Назначения: ручное назначение пользователей ────────────────────────────

export const getCourseAssignments = async (courseId) => {
  const response = await axios.get(`/admin/courses/${courseId}/assignments`, { cacheMaxAge: 10000 });
  return response.data;
};

export const addCourseAssignment = async (courseId, userId, deadlineAt = null) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post(`/admin/courses/${courseId}/assignments`, { userId, deadlineAt });
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const closeCourseAssignment = async (courseId, userId) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.post(`/admin/courses/${courseId}/assignments/${userId}/close`);
    return response.data;
  }, /get:\/admin\/courses/i);
};

export const removeCourseAssignment = async (courseId, userId) => {
  return mutateWithInvalidation(async () => {
    const response = await axios.delete(`/admin/courses/${courseId}/assignments/${userId}`);
    return response.data;
  }, /get:\/admin\/courses/i);
};

// ─── Прогресс пользователей ──────────────────────────────────────────────────

export const getCourseUsers = async (courseId) => {
  const response = await axios.get(`/admin/courses/${courseId}/users`);
  return response.data;
};

export const getCourseUserProgress = async (courseId, userId) => {
  const response = await axios.get(`/admin/courses/${courseId}/users/${userId}/progress`);
  return response.data;
};

export const resetCourseUserProgress = async (courseId, userId) => {
  return mutateWithInvalidation(async () => {
    await axios.delete(`/admin/courses/${courseId}/users/${userId}/progress`);
  }, /get:\/admin\/courses/i);
};

// ─── Аналитика курсов ────────────────────────────────────────────────────────

export const getCourseAnalyticsFunnel = async () => {
  const response = await axios.get("/admin/courses/analytics/funnel");
  return response.data;
};

export const getCourseSectionFailures = async (courseId) => {
  const response = await axios.get(`/admin/courses/${courseId}/analytics/sections`);
  return response.data;
};

export const getCourseProgressReport = async (courseId) => {
  const response = await axios.get(`/admin/courses/${courseId}/analytics/progress-report`);
  return response.data;
};
