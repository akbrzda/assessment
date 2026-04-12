const { pool } = require("../../../config/database");

async function listPositions({ search }) {
  let query = `
    SELECT
      p.id,
      p.name,
      p.is_visible_in_miniapp,
      p.created_at,
      COUNT(DISTINCT u.id) AS employees_count,
      COUNT(DISTINCT aa.id) AS assessments_completed,
      AVG(aa.score_percent) AS avg_score
    FROM positions p
    LEFT JOIN users u ON p.id = u.position_id
    LEFT JOIN assessment_attempts aa ON u.id = aa.user_id AND aa.status = 'completed'
    WHERE 1 = 1
  `;

  const params = [];

  if (search) {
    query += " AND p.name LIKE ?";
    params.push(`%${search}%`);
  }

  query += " GROUP BY p.id ORDER BY p.id ASC";
  const [rows] = await pool.query(query, params);
  return rows;
}

async function findPositionById(positionId) {
  const [rows] = await pool.query(
    "SELECT id, name, is_visible_in_miniapp, created_at, updated_at FROM positions WHERE id = ?",
    [positionId],
  );
  return rows[0] || null;
}

async function getPositionStats(positionId) {
  const [rows] = await pool.query(
    `
    SELECT
      COUNT(DISTINCT u.id) AS employees_count,
      COUNT(DISTINCT aa.id) AS assessments_completed,
      AVG(aa.score_percent) AS avg_score
    FROM users u
    LEFT JOIN assessment_attempts aa ON u.id = aa.user_id AND aa.status = 'completed'
    WHERE u.position_id = ?
  `,
    [positionId],
  );

  return rows[0] || {
    employees_count: 0,
    assessments_completed: 0,
    avg_score: null,
  };
}

async function findByName(name, options = {}) {
  const { excludeId } = options;

  if (excludeId) {
    const [rows] = await pool.query("SELECT id FROM positions WHERE name = ? AND id != ?", [
      name,
      excludeId,
    ]);
    return rows[0] || null;
  }

  const [rows] = await pool.query("SELECT id FROM positions WHERE name = ?", [name]);
  return rows[0] || null;
}

async function createPosition({ name, isVisibleInMiniapp }) {
  const [result] = await pool.query(
    "INSERT INTO positions (name, is_visible_in_miniapp) VALUES (?, ?)",
    [name, isVisibleInMiniapp ? 1 : 0],
  );
  return result.insertId;
}

async function updatePosition(positionId, { name, isVisibleInMiniapp }) {
  await pool.query(
    "UPDATE positions SET name = ?, is_visible_in_miniapp = ? WHERE id = ?",
    [name, isVisibleInMiniapp ? 1 : 0, positionId],
  );
}

async function countUsersByPosition(positionId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM users WHERE position_id = ?",
    [positionId],
  );
  return Number(rows[0]?.count || 0);
}

async function deletePosition(positionId) {
  await pool.query("DELETE FROM positions WHERE id = ?", [positionId]);
}

module.exports = {
  listPositions,
  findPositionById,
  getPositionStats,
  findByName,
  createPosition,
  updatePosition,
  countUsersByPosition,
  deletePosition,
};
