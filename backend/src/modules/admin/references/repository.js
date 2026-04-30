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
  const [rows] = await pool.query(
    "SELECT id, name, is_visible_in_miniapp FROM positions ORDER BY name",
  );
  return rows;
}

async function findRoles() {
  const [rows] = await pool.query(
    "SELECT id, name, description FROM roles ORDER BY name",
  );
  return rows;
}

module.exports = {
  findBranches,
  findPositions,
  findRoles,
};
