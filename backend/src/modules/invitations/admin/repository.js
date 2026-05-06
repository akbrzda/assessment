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

async function findByBranches(branchIds) {
  if (!Array.isArray(branchIds) || branchIds.length === 0) {
    return [];
  }

  const [rows] = await pool.query(
    `SELECT
       i.id,
       i.code,
       i.role_id,
       i.branch_id,
       i.first_name,
       i.last_name,
       i.phone,
       i.position_id,
       i.created_by,
       i.created_at,
       i.updated_at,
       i.used_by,
       i.used_at,
       i.invited_user_id,
       b.name AS branch_name,
       b.city AS branch_city,
       p.name AS position_name,
       CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) AS created_by_name,
       CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS used_by_name
     FROM invitations i
     LEFT JOIN branches b ON b.id = i.branch_id
     LEFT JOIN positions p ON p.id = i.position_id
     LEFT JOIN users c ON c.id = i.created_by
     LEFT JOIN users u ON u.id = i.used_by
     WHERE i.branch_id IN (?)
     ORDER BY i.created_at DESC, i.id DESC`,
    [branchIds],
  );

  return rows;
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

async function removePendingInvitedUserIfUnused({ userId, currentInvitationId }) {
  if (!userId) {
    return;
  }

  await pool.execute(
    `DELETE FROM users
     WHERE id = ?
       AND telegram_id IS NULL
       AND deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1
         FROM invitations
         WHERE invited_user_id = ?
           AND id <> ?
       )`,
    [userId, userId, currentInvitationId],
  );
}

async function findUserBranchId(userId) {
  const [rows] = await pool.query("SELECT branch_id FROM users WHERE id = ? LIMIT 1", [userId]);
  return rows[0]?.branch_id || null;
}

async function findManagerBranchIds(userId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT branch_id AS branchId
     FROM branch_managers
     WHERE user_id = ?`,
    [userId],
  );
  return rows.map((item) => Number(item.branchId)).filter((item) => item > 0);
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
  findByBranches,
  findById,
  findActiveByCode,
  findManagerRole,
  findEmployeeRole,
  findPositionById,
  createInvitation,
  updateInvitation,
  removeInvitation,
  removePendingInvitedUserIfUnused,
  findUserBranchId,
  findManagerBranchIds,
  updatePendingUserProfile,
};
