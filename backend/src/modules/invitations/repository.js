const invitationModel = require("../../models/invitationModel");
const referenceModel = require("../../models/referenceModel");

async function findActiveByCode(code) {
  return invitationModel.findActiveByCode(code);
}

async function findManagerRole() {
  return referenceModel.getRoleByName("manager");
}

async function createInvitation(payload) {
  return invitationModel.createInvitation(payload);
}

async function findById(invitationId) {
  return invitationModel.findById(invitationId);
}

async function listByCreator(userId) {
  return invitationModel.listInvitationsByCreator(userId);
}

async function updateExpiration(invitationId, expiresAt) {
  return invitationModel.updateExpiration(invitationId, expiresAt);
}

async function deleteInvitation(invitationId) {
  return invitationModel.deleteInvitation(invitationId);
}

async function updateInvitation(invitationId, payload) {
  return invitationModel.updateInvitation(invitationId, payload);
}

module.exports = {
  findActiveByCode,
  findManagerRole,
  createInvitation,
  findById,
  listByCreator,
  updateExpiration,
  deleteInvitation,
  updateInvitation,
};
