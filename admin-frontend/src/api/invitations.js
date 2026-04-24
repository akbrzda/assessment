import apiClient from "../utils/axios";

export const listInvitations = () => apiClient.get("/admin/invitations");

export const createInvitation = (payload) => apiClient.post("/admin/invitations", payload);

export const updateInvitation = (id, payload) => apiClient.patch(`/admin/invitations/${id}`, payload);

export const deleteInvitation = (id) => apiClient.delete(`/admin/invitations/${id}`);

export default {
  listInvitations,
  createInvitation,
  updateInvitation,
  deleteInvitation,
};
