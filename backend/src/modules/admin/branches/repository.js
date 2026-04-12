const { pool } = require("../../../config/database");

const MANAGERS_QUERY = `
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.telegram_id,
    r.name AS role_name,
    COUNT(DISTINCT bm.branch_id) AS branches_count
  FROM users u
  LEFT JOIN roles r ON u.role_id = r.id
  LEFT JOIN branch_managers bm ON u.id = bm.user_id
  WHERE r.name IN ('manager', 'superadmin')
  GROUP BY u.id
  ORDER BY u.first_name, u.last_name
`;

async function listBranches({ search }) {
  let query = `
    SELECT
      b.id,
      b.name,
      b.city,
      b.is_visible_in_miniapp,
      b.created_at,
      COUNT(DISTINCT u.id) AS employees_count,
      COUNT(DISTINCT aa.id) AS assessments_completed,
      AVG(aa.score_percent) AS avg_score,
      GROUP_CONCAT(DISTINCT CONCAT(m.first_name, ' ', m.last_name) SEPARATOR ', ') AS managers
    FROM branches b
    LEFT JOIN users u ON b.id = u.branch_id
    LEFT JOIN assessment_attempts aa ON u.id = aa.user_id AND aa.status = 'completed'
    LEFT JOIN branch_managers bm ON b.id = bm.branch_id
    LEFT JOIN users m ON bm.user_id = m.id
    LEFT JOIN roles mr ON m.role_id = mr.id
    WHERE 1 = 1
  `;

  const params = [];

  if (search) {
    query += " AND (b.name LIKE ? OR b.city LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " AND (mr.name IN ('manager', 'superadmin') OR mr.name IS NULL)";
  query += " GROUP BY b.id ORDER BY b.id ASC";

  const [rows] = await pool.query(query, params);
  return rows;
}

async function findBranchById(branchId) {
  const [rows] = await pool.query(
    "SELECT id, name, city, is_visible_in_miniapp, created_at, updated_at FROM branches WHERE id = ?",
    [branchId],
  );
  return rows[0] || null;
}

async function findBranchByName(name, options = {}) {
  const { excludeId } = options;

  if (excludeId) {
    const [rows] = await pool.query(
      "SELECT id FROM branches WHERE name = ? AND id != ?",
      [name, excludeId],
    );
    return rows[0] || null;
  }

  const [rows] = await pool.query("SELECT id FROM branches WHERE name = ?", [name]);
  return rows[0] || null;
}

async function getBranchStats(branchId) {
  const [rows] = await pool.query(
    `
    SELECT
      COUNT(DISTINCT u.id) AS employees_count,
      COUNT(DISTINCT aa.id) AS assessments_completed,
      AVG(aa.score_percent) AS avg_score
    FROM users u
    LEFT JOIN assessment_attempts aa ON u.id = aa.user_id AND aa.status = 'completed'
    WHERE u.branch_id = ?
  `,
    [branchId],
  );

  return rows[0] || {
    employees_count: 0,
    assessments_completed: 0,
    avg_score: null,
  };
}

async function listManagersByBranch(branchId) {
  const [rows] = await pool.query(
    `
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.telegram_id,
      r.name AS role_name,
      bm.assigned_at
    FROM branch_managers bm
    JOIN users u ON bm.user_id = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE bm.branch_id = ?
    ORDER BY bm.assigned_at DESC
  `,
    [branchId],
  );

  return rows;
}

async function listManagers() {
  const [rows] = await pool.query(MANAGERS_QUERY);
  return rows;
}

async function createBranch({ name, city, isVisibleInMiniapp }) {
  const [result] = await pool.query(
    "INSERT INTO branches (name, city, is_visible_in_miniapp) VALUES (?, ?, ?)",
    [name, city, isVisibleInMiniapp ? 1 : 0],
  );
  return result.insertId;
}

async function updateBranch(branchId, { name, city, isVisibleInMiniapp }) {
  await pool.query(
    "UPDATE branches SET name = ?, city = ?, is_visible_in_miniapp = ? WHERE id = ?",
    [name, city, isVisibleInMiniapp ? 1 : 0, branchId],
  );
}

async function countUsersByBranch(branchId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM users WHERE branch_id = ?",
    [branchId],
  );
  return Number(rows[0]?.count || 0);
}

async function deleteBranch(branchId) {
  await pool.query("DELETE FROM branches WHERE id = ?", [branchId]);
}

async function findUserWithRole(userId) {
  const [rows] = await pool.query(
    `
    SELECT u.id, u.first_name, u.last_name, r.name AS role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `,
    [userId],
  );
  return rows[0] || null;
}

async function findManagerAssignment(branchId, userId) {
  const [rows] = await pool.query(
    "SELECT id FROM branch_managers WHERE branch_id = ? AND user_id = ?",
    [branchId, userId],
  );
  return rows[0] || null;
}

async function createManagerAssignment(branchId, userId) {
  await pool.query("INSERT INTO branch_managers (branch_id, user_id) VALUES (?, ?)", [
    branchId,
    userId,
  ]);
}

async function deleteManagerAssignment(branchId, userId) {
  const [result] = await pool.query(
    "DELETE FROM branch_managers WHERE branch_id = ? AND user_id = ?",
    [branchId, userId],
  );
  return result.affectedRows;
}

async function findBranchesByIds(branchIds) {
  const [rows] = await pool.query("SELECT id, name FROM branches WHERE id IN (?)", [branchIds]);
  return rows;
}

async function deleteManagerAssignmentsByUser(userId) {
  await pool.query("DELETE FROM branch_managers WHERE user_id = ?", [userId]);
}

async function createManagerAssignmentsBatch(userId, branchIds) {
  const values = branchIds.map((branchId) => [branchId, userId]);
  await pool.query("INSERT IGNORE INTO branch_managers (branch_id, user_id) VALUES ?", [values]);
}

module.exports = {
  listBranches,
  findBranchById,
  findBranchByName,
  getBranchStats,
  listManagersByBranch,
  listManagers,
  createBranch,
  updateBranch,
  countUsersByBranch,
  deleteBranch,
  findUserWithRole,
  findManagerAssignment,
  createManagerAssignment,
  deleteManagerAssignment,
  findBranchesByIds,
  deleteManagerAssignmentsByUser,
  createManagerAssignmentsBatch,
};
