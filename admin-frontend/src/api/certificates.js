import axios from "../utils/axios";

export const getCertificates = async (filters = {}) => {
  const response = await axios.get("/admin/certificates", { params: filters, cache: false });
  return response.data;
};

export const revokeCertificate = async (id) => {
  const response = await axios.post(`/admin/certificates/${id}/revoke`);
  return response.data;
};

export const issueCertificate = async (payload) => {
  const response = await axios.post("/admin/certificates/issue", payload);
  return response.data;
};

export const downloadCertificate = async (uuid) => {
  const response = await axios.get(`/admin/certificates/${uuid}/download`, {
    responseType: "blob",
    cache: false,
  });
  return response.data;
};
