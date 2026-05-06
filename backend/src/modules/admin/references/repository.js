const { pool } = require("../../../config/database");

async function findBranches() {
  const [rows] = await pool.query(
    `
      SELECT b.id, b.name, b.city, b.is_visible_in_miniapp
      FROM branches b
      LEFT JOIN users u ON u.branch_id = b.id
      LEFT JOIN assessment_attempts aa ON aa.user_id = u.id
      GROUP BY b.id, b.name, b.city, b.is_visible_in_miniapp
      HAVING b.is_visible_in_miniapp = 1
        OR COUNT(DISTINCT u.id) > 0
        OR COUNT(DISTINCT aa.id) > 0
      ORDER BY b.name
    `,
  );
  return rows;
}

async function findPositions() {
  const [rows] = await pool.query("SELECT id, name, is_visible_in_miniapp FROM positions ORDER BY name");
  return rows;
}

async function findRoles() {
  const [rows] = await pool.query("SELECT id, name, description FROM roles ORDER BY name");
  return rows;
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

async function findUserBranchId(userId) {
  const [rows] = await pool.query("SELECT branch_id AS branchId FROM users WHERE id = ? LIMIT 1", [userId]);
  return Number(rows?.[0]?.branchId || 0);
}

async function findBranchesByIds(branchIds) {
  if (!Array.isArray(branchIds) || branchIds.length === 0) {
    return [];
  }

  const [rows] = await pool.query(
    `SELECT b.id, b.name, b.city, b.is_visible_in_miniapp
     FROM branches b
     WHERE b.id IN (?)
     ORDER BY b.name`,
    [branchIds],
  );
  return rows;
}

async function findPositionsByBranchIds(branchIds) {
  if (!Array.isArray(branchIds) || branchIds.length === 0) {
    return [];
  }

  const [rows] = await pool.query(
    `SELECT DISTINCT p.id, p.name, p.is_visible_in_miniapp
     FROM positions p
     INNER JOIN users u ON u.position_id = p.id
     WHERE u.branch_id IN (?)
     ORDER BY p.name`,
    [branchIds],
  );
  return rows;
}

module.exports = {
  findBranches,
  findPositions,
  findRoles,
  findManagerBranchIds,
  findUserBranchId,
  findBranchesByIds,
  findPositionsByBranchIds,
};
