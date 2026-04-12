const invitationModel = require("../../../models/invitationModel");
const referenceModel = require("../../../models/referenceModel");

async function findAll() {
  return invitationModel.findAll();
}

async function findByCreator(userId) {
  return invitationModel.findByCreator(userId);
}

async function findById(invitationId) {
  return invitationModel.findById(invitationId);
}

async function findActiveByCode(code) {
  return invitationModel.findActiveByCode(code);
}

async function findManagerRole() {
  return referenceModel.getRoleByName("manager");
}

async function createInvitation(payload) {
  return invitationModel.createInvitation(payload);
}

async function updateInvitation(invitationId, payload) {
  return invitationModel.updateInvitation(invitationId, payload);
}

async function updateExpiration(invitationId, expiresAt) {
  return invitationModel.updateExpiration(invitationId, expiresAt);
}

async function removeInvitation(invitationId) {
  return invitationModel.deleteInvitation(invitationId);
}

module.exports = {
  findAll,
  findByCreator,
  findById,
  findActiveByCode,
  findManagerRole,
  createInvitation,
  updateInvitation,
  updateExpiration,
  removeInvitation,
};
