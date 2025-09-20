const { pool } = require('../config/database');

async function createInvitation({ code, roleId, branchId, firstName, lastName, expiresAt, createdBy }) {
  const [result] = await pool.execute(
    `INSERT INTO invitations (code, role_id, branch_id, first_name, last_name, expires_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [code, roleId, branchId, firstName, lastName, expiresAt, createdBy]
  );
  return result.insertId;
}

async function findActiveByCode(code) {
  const [rows] = await pool.execute(
    `SELECT inv.*, r.name AS role_name, b.name AS branch_name
     FROM invitations inv
     LEFT JOIN roles r ON r.id = inv.role_id
     LEFT JOIN branches b ON b.id = inv.branch_id
     WHERE inv.code = ?
       AND inv.expires_at >= NOW()
       AND inv.used_by IS NULL
     LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT inv.*, r.name AS role_name, b.name AS branch_name,
            CONCAT(used_user.first_name, ' ', used_user.last_name) AS used_by_name
     FROM invitations inv
     LEFT JOIN roles r ON r.id = inv.role_id
     LEFT JOIN branches b ON b.id = inv.branch_id
     LEFT JOIN users used_user ON used_user.id = inv.used_by
     WHERE inv.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function markUsed(invitationId, userId) {
  await pool.execute(
    `UPDATE invitations
     SET used_by = ?, used_at = NOW()
     WHERE id = ?`,
    [userId, invitationId]
  );
}

async function listInvitationsByCreator(userId) {
  const [rows] = await pool.execute(
    `SELECT inv.id, inv.code, inv.first_name, inv.last_name,
            inv.expires_at, inv.created_at, inv.used_at,
            inv.used_by, inv.branch_id,
            b.name AS branch_name,
            r.name AS role_name,
            CONCAT(used_user.first_name, ' ', used_user.last_name) AS used_by_name
     FROM invitations inv
     LEFT JOIN branches b ON b.id = inv.branch_id
     LEFT JOIN roles r ON r.id = inv.role_id
     LEFT JOIN users used_user ON used_user.id = inv.used_by
     WHERE inv.created_by = ?
     ORDER BY inv.created_at DESC`,
    [userId]
  );
  return rows;
}

async function updateExpiration(invitationId, expiresAt) {
  await pool.execute(
    `UPDATE invitations SET expires_at = ?, updated_at = NOW() WHERE id = ?`,
    [expiresAt, invitationId]
  );
}

async function deleteInvitation(invitationId) {
  await pool.execute('DELETE FROM invitations WHERE id = ?', [invitationId]);
}

module.exports = {
  createInvitation,
  findActiveByCode,
  findById,
  markUsed,
  listInvitationsByCreator,
  updateExpiration,
  deleteInvitation
};
