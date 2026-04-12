const { pool } = require("../../../config/database");

async function findBranches() {
  const [rows] = await pool.query(
    "SELECT id, name, city, is_visible_in_miniapp FROM branches ORDER BY name",
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
