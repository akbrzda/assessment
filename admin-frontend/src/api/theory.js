import axios from "../utils/axios";

export const getAdminTheory = async (assessmentId) => {
  const response = await axios.get(`/admin/assessments/${assessmentId}/theory`);
  return response.data;
};

export const publishTheory = async (assessmentId, payload) => {
  const response = await axios.post(`/admin/assessments/${assessmentId}/theory/publish`, payload);
  return response.data;
};
