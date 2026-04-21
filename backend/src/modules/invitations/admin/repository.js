const invitationModel = require("../../../models/invitationModel");
const referenceModel = require("../../../models/referenceModel");
const { pool } = require("../../../config/database");

async function findAll() {
  return invitationModel.findAll();
}

async function findByCreator(userId) {
  return invitationModel.findByCreator(userId);
}

async function findByBranch(branchId) {
  return invitationModel.findByBranch(branchId);
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

async function findUserBranchId(userId) {
  const [rows] = await pool.query("SELECT branch_id FROM users WHERE id = ? LIMIT 1", [userId]);
  return rows[0]?.branch_id || null;
}

module.exports = {
  findAll,
  findByCreator,
  findByBranch,
  findById,
  findActiveByCode,
  findManagerRole,
  createInvitation,
  updateInvitation,
  updateExpiration,
  removeInvitation,
  findUserBranchId,
};
