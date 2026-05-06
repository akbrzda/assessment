const { pool } = require("../../config/database");
const { v4: uuidv4 } = require("crypto");

/**
 * Генерирует UUID v4 без внешней зависимости.
 */
function generateUuid() {
  // crypto.randomUUID доступен с Node 14.17
  return require("crypto").randomUUID();
}

/**
 * Создаёт запись сертификата в статусе pending.
 * Возвращает id и uuid новой записи или null при дубликате.
 */
async function create({ userId, courseId, attemptId = null, scorePercent = null }) {
  // Дедупликация: один сертификат на пару (user, course)
  const [existing] = await pool.execute(`SELECT id, uuid, status FROM certificates WHERE user_id = ? AND course_id = ? LIMIT 1`, [userId, courseId]);
  if (existing.length > 0) {
    return existing[0];
  }

  const uuid = generateUuid();
  const [result] = await pool.execute(
    `INSERT INTO certificates (uuid, user_id, course_id, attempt_id, score_percent)
     VALUES (?, ?, ?, ?, ?)`,
    [uuid, userId, courseId, attemptId ?? null, scorePercent ?? null],
  );
  return { id: result.insertId, uuid, status: "pending" };
}

/**
 * Обновляет статус сертификата.
 */
async function updateStatus(id, { status, filePath = null, fileUrl = null, issuedAt = null }) {
  await pool.execute(
    `UPDATE certificates
     SET status = ?,
         file_path = COALESCE(?, file_path),
         file_url = COALESCE(?, file_url),
         issued_at = COALESCE(?, issued_at)
     WHERE id = ?`,
    [status, filePath, fileUrl, issuedAt, id],
  );
}

/**
 * Записывает snapshot_data при успешной генерации.
 */
async function saveSnapshot(id, snapshotData) {
  await pool.execute(`UPDATE certificates SET snapshot_data = ? WHERE id = ?`, [JSON.stringify(snapshotData), id]);
}

/**
 * Находит сертификаты пользователя (с данными курса).
 */
async function findByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT c.id, c.uuid, c.status, c.score_percent, c.issued_at, c.file_url,
            co.title AS course_title, co.id AS course_id
     FROM certificates c
     JOIN courses co ON co.id = c.course_id
     WHERE c.user_id = ? AND c.status = 'issued'
     ORDER BY c.issued_at DESC`,
    [userId],
  );
  return rows;
}

/**
 * Находит сертификат по UUID (публичный доступ).
 */
async function findByUuid(uuid) {
  const [rows] = await pool.execute(
    `SELECT c.id, c.uuid, c.status, c.score_percent, c.issued_at, c.file_path, c.file_url,
            c.snapshot_data, c.revoked_at, c.revoked_by,
            co.title AS course_title, co.id AS course_id,
            u.first_name, u.last_name
     FROM certificates c
     JOIN courses co ON co.id = c.course_id
     JOIN users u ON u.id = c.user_id
     WHERE c.uuid = ? LIMIT 1`,
    [uuid],
  );
  return rows[0] ?? null;
}

/**
 * Аннулирует сертификат.
 */
async function revoke(id, revokedBy) {
  const [result] = await pool.execute(
    `UPDATE certificates SET status = 'revoked', revoked_at = NOW(), revoked_by = ?
     WHERE id = ? AND status = 'issued'`,
    [revokedBy, id],
  );
  return result.affectedRows > 0;
}

/**
 * Список для администратора с фильтрами.
 */
async function findAll({ userId = null, courseId = null, status = null, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (userId) {
    conditions.push("c.user_id = ?");
    params.push(userId);
  }
  if (courseId) {
    conditions.push("c.course_id = ?");
    params.push(courseId);
  }
  if (status) {
    conditions.push("c.status = ?");
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM certificates c ${where}`, params);
  const total = countRows[0].total;

  const [rows] = await pool.execute(
    `SELECT c.id, c.uuid, c.status, c.score_percent, c.issued_at, c.revoked_at, c.file_url,
            co.title AS course_title,
            u.first_name, u.last_name
     FROM certificates c
     JOIN courses co ON co.id = c.course_id
     JOIN users u ON u.id = c.user_id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, BigInt(limit), BigInt(offset)],
  );

  return { items: rows, total, page, limit };
}

/**
 * Выбирает сертификаты со статусом generation_failed для повторной генерации.
 */
async function findFailed(limit = 20) {
  const [rows] = await pool.execute(
    `SELECT c.id, c.uuid, c.user_id, c.course_id, c.attempt_id, c.score_percent,
            u.first_name, u.last_name, co.title AS course_title
     FROM certificates c
     JOIN users u ON u.id = c.user_id
     JOIN courses co ON co.id = c.course_id
     WHERE c.status = 'generation_failed'
     LIMIT ?`,
    [BigInt(limit)],
  );
  return rows;
}

/**
 * Находит последний issued сертификат пользователя по telegram_id.
 */
async function findLastByTelegramId(telegramId) {
  const [rows] = await pool.execute(
    `SELECT c.uuid, c.file_path, c.issued_at, co.title AS course_title
     FROM certificates c
     JOIN users u ON u.id = c.user_id
     JOIN courses co ON co.id = c.course_id
     WHERE u.telegram_id = ? AND c.status = 'issued'
     ORDER BY c.issued_at DESC
     LIMIT 1`,
    [String(telegramId)],
  );
  return rows[0] ?? null;
}

/**
 * Находит все issued сертификаты пользователя по telegram_id.
 */
async function findAllByTelegramId(telegramId) {
  console.log("[certRepository.findAllByTelegramId] executing query for telegramId=%s", telegramId);
  const [rows] = await pool.execute(
    `SELECT c.uuid, c.file_path, c.issued_at, co.title AS course_title
     FROM certificates c
     JOIN users u ON u.id = c.user_id
     JOIN courses co ON co.id = c.course_id
     WHERE u.telegram_id = ? AND c.status = 'issued'
     ORDER BY c.issued_at DESC`,
    [String(telegramId)],
  );
  console.log("[certRepository.findAllByTelegramId] query returned %d rows for telegramId=%s", rows.length, telegramId);
  return rows;
}

module.exports = {
  create,
  updateStatus,
  saveSnapshot,
  findByUserId,
  findByUuid,
  revoke,
  findAll,
  findFailed,
  findLastByTelegramId,
  findAllByTelegramId,
};
