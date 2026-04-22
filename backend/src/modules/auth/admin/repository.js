const { pool } = require("../../../config/database");

async function findUserByLogin(login) {
  const [users] = await pool.query(
    `SELECT u.*, r.name as role_name, b.name as branch_name, p.name as position_name
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     LEFT JOIN branches b ON u.branch_id = b.id
     LEFT JOIN positions p ON u.position_id = p.id
     WHERE u.login = ?`,
    [login]
  );

  return users[0] || null;
}

async function findUserByRefreshToken(userId, refreshToken) {
  const [users] = await pool.query(
    `SELECT u.*, r.name as role_name
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = ? AND u.refresh_token = ?`,
    [userId, refreshToken]
  );

  return users[0] || null;
}

async function updateRefreshToken(userId, refreshToken) {
  await pool.query("UPDATE users SET refresh_token = ? WHERE id = ?", [refreshToken, userId]);
}

async function clearRefreshToken(userId) {
  await pool.query("UPDATE users SET refresh_token = NULL WHERE id = ?", [userId]);
}

module.exports = {
  findUserByLogin,
  findUserByRefreshToken,
  updateRefreshToken,
  clearRefreshToken,
};
