const { pool } = require('../config/database');

async function setItem({ telegramId, key, value }) {
  await pool.execute(
    `INSERT INTO webapp_storage (telegram_id, storage_key, storage_value)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE storage_value = VALUES(storage_value), updated_at = CURRENT_TIMESTAMP`,
    [telegramId, key, value]
  );
}

async function getItem({ telegramId, key }) {
  const [rows] = await pool.execute(
    `SELECT storage_value FROM webapp_storage
      WHERE telegram_id = ? AND storage_key = ?
      LIMIT 1`,
    [telegramId, key]
  );
  return rows.length ? rows[0].storage_value : null;
}

module.exports = {
  setItem,
  getItem
};
