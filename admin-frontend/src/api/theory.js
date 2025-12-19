import axios from "../utils/axios";

export const getAdminTheory = async (assessmentId) => {
  const response = await axios.get(`/admin/assessments/${assessmentId}/theory`);
  return response.data;
};

export const saveTheoryDraft = async (assessmentId, payload) => {
  const response = await axios.put(`/admin/assessments/${assessmentId}/theory/draft`, payload);
  return response.data;
};

export const publishTheory = async (assessmentId, mode) => {
  const response = await axios.post(`/admin/assessments/${assessmentId}/theory/publish`, { mode });
  return response.data;
};
