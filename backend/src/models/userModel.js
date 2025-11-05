const { pool } = require("../config/database");

function mapUserRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    telegramId: row.telegram_id,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    positionId: row.position_id,
    branchId: row.branch_id,
    roleId: row.role_id,
    roleName: row.role_name,
    branchName: row.branch_name,
    positionName: row.position_name,
    level: row.level,
    points: row.points,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findByTelegramId(telegramId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.avatar_url, u.position_id, u.branch_id,
            u.role_id, u.level, u.points, u.created_at, u.updated_at,
            r.name AS role_name,
            b.name AS branch_name,
            p.name AS position_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN positions p ON p.id = u.position_id
     WHERE u.telegram_id = ?
     LIMIT 1`,
    [telegramId]
  );
  return mapUserRow(rows[0]);
}

async function createUser({ telegramId, firstName, lastName, avatarUrl, positionId, branchId, roleId }) {
  const [result] = await pool.execute(
    `INSERT INTO users (telegram_id, first_name, last_name, avatar_url, position_id, branch_id, role_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [telegramId, firstName, lastName, avatarUrl, positionId, branchId, roleId]
  );
  return result.insertId;
}

async function updateProfile(userId, { firstName, lastName }) {
  await pool.execute(`UPDATE users SET first_name = ?, last_name = ?, updated_at = NOW() WHERE id = ?`, [firstName, lastName, userId]);
}

async function getDashboardData(userId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.avatar_url, u.position_id, u.branch_id,
            u.role_id, u.level, u.points, u.created_at, u.updated_at,
            r.name AS role_name,
            b.name AS branch_name,
            p.name AS position_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN positions p ON p.id = u.position_id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  return mapUserRow(rows[0]);
}

async function listUsers() {
  const [rows] = await pool.execute(
    `SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.avatar_url, u.position_id, u.branch_id,
            u.role_id, u.level, u.points, u.created_at, u.updated_at,
            r.name AS role_name,
            b.name AS branch_name,
            p.name AS position_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN positions p ON p.id = u.position_id
     ORDER BY u.created_at DESC`
  );
  return rows.map(mapUserRow);
}

async function findById(userId) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.avatar_url, u.position_id, u.branch_id,
            u.role_id, u.level, u.points, u.created_at, u.updated_at,
            r.name AS role_name,
            b.name AS branch_name,
            p.name AS position_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN positions p ON p.id = u.position_id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  return mapUserRow(rows[0]);
}

async function updateUserByAdmin(userId, { firstName, lastName, positionId, branchId, roleId, login, level, points }) {
  const fields = [];
  const values = [];

  fields.push("first_name = ?", "last_name = ?", "position_id = ?", "branch_id = ?", "role_id = ?");
  values.push(firstName, lastName, positionId, branchId, roleId);

  if (login !== undefined) {
    fields.push("login = ?");
    values.push(login);
  }

  if (level !== undefined) {
    fields.push("level = ?");
    values.push(level);
  }

  if (points !== undefined) {
    fields.push("points = ?");
    values.push(points);
  }

  fields.push("updated_at = NOW()");
  values.push(userId);

  await pool.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
}

async function deleteUser(userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute("UPDATE invitations SET used_by = NULL, used_at = NULL WHERE used_by = ?", [userId]);

    await connection.execute("DELETE FROM users WHERE id = ?", [userId]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateAvatar(userId, avatarUrl) {
  await pool.execute("UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?", [avatarUrl, userId]);
}

async function findByIds(ids) {
  if (!ids || ids.length === 0) {
    return [];
  }
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.execute(
    `SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.avatar_url, u.position_id, u.branch_id,
            u.role_id, u.level, u.points, u.created_at, u.updated_at,
            r.name AS role_name,
            b.name AS branch_name,
            p.name AS position_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN positions p ON p.id = u.position_id
     WHERE u.id IN (${placeholders})`,
    ids
  );
  return rows.map(mapUserRow);
}

module.exports = {
  findByTelegramId,
  createUser,
  updateProfile,
  getDashboardData,
  listUsers,
  findById,
  updateUserByAdmin,
  deleteUser,
  updateAvatar,
  findByIds,
};
