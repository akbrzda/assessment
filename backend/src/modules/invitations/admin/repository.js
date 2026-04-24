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

async function findEmployeeRole() {
  return referenceModel.getRoleByName("employee");
}

async function findPositionById(positionId) {
  return referenceModel.getPositionById(positionId);
}

async function createInvitation(payload) {
  return invitationModel.createInvitation(payload);
}

async function updateInvitation(invitationId, payload) {
  return invitationModel.updateInvitation(invitationId, payload);
}

async function removeInvitation(invitationId) {
  return invitationModel.deleteInvitation(invitationId);
}

async function findUserBranchId(userId) {
  const [rows] = await pool.query("SELECT branch_id FROM users WHERE id = ? LIMIT 1", [userId]);
  return rows[0]?.branch_id || null;
}

async function updatePendingUserProfile(userId, { firstName, lastName, branchId, positionId }) {
  await pool.execute(
    `UPDATE users SET first_name = ?, last_name = ?, branch_id = ?, position_id = COALESCE(?, position_id), updated_at = NOW()
     WHERE id = ? AND telegram_id IS NULL`,
    [firstName, lastName, branchId, positionId || null, userId],
  );
}

module.exports = {
  findAll,
  findByCreator,
  findByBranch,
  findById,
  findActiveByCode,
  findManagerRole,
  findEmployeeRole,
  findPositionById,
  createInvitation,
  updateInvitation,
  removeInvitation,
  findUserBranchId,
  updatePendingUserProfile,
};
