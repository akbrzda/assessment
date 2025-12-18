const { pool } = require("../config/database");

async function getPositions() {
  // Исключаем "Управляющий" для обычных пользователей (регистрация, фильтры)
  const [rows] = await pool.execute(
    "SELECT id, name FROM positions WHERE name != 'Управляющий' AND is_visible_in_miniapp = 1 ORDER BY name ASC"
  );
  return rows;
}

async function getAllPositions() {
  // Возвращаем все должности (для админа)
  const [rows] = await pool.execute("SELECT id, name, is_visible_in_miniapp FROM positions ORDER BY name ASC");
  return rows;
}

async function getBranches() {
  const [rows] = await pool.execute("SELECT id, name FROM branches WHERE is_visible_in_miniapp = 1 ORDER BY name ASC");
  return rows;
}

async function getAllBranches() {
  const [rows] = await pool.execute("SELECT id, name, city, is_visible_in_miniapp FROM branches ORDER BY name ASC");
  return rows;
}

async function getRoles() {
  const [rows] = await pool.execute("SELECT id, name FROM roles ORDER BY name ASC");
  return rows;
}

async function getRoleByName(roleName) {
  const [rows] = await pool.execute("SELECT id, name FROM roles WHERE name = ? LIMIT 1", [roleName]);
  return rows[0] || null;
}

async function getBranchById(id) {
  const [rows] = await pool.execute("SELECT id, name FROM branches WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function getBranchesByIds(ids) {
  if (!ids || ids.length === 0) {
    return [];
  }
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.execute(`SELECT id, name FROM branches WHERE id IN (${placeholders})`, ids);
  return rows;
}

async function getPositionById(id) {
  const [rows] = await pool.execute("SELECT id, name FROM positions WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function getPositionByName(name) {
  const [rows] = await pool.execute("SELECT id, name FROM positions WHERE name = ? LIMIT 1", [name]);
  return rows[0] || null;
}

async function getPositionsByIds(ids) {
  if (!ids || ids.length === 0) {
    return [];
  }
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.execute(`SELECT id, name FROM positions WHERE id IN (${placeholders})`, ids);
  return rows;
}

async function getRoleById(id) {
  const [rows] = await pool.execute("SELECT id, name FROM roles WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

module.exports = {
  getPositions,
  getAllPositions,
  getBranches,
  getAllBranches,
  getRoles,
  getRoleByName,
  getBranchById,
  getBranchesByIds,
  getPositionById,
  getPositionsByIds,
  getPositionByName,
  getRoleById,
};
