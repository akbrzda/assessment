const { pool } = require("../config/database");

async function findByPlatformUserId(platform, platformUserId) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, platform, platform_user_id, platform_username, is_verified, verified_at, created_at, updated_at
     FROM user_platform_identities
     WHERE platform = ? AND platform_user_id = ?
     LIMIT 1`,
    [platform, platformUserId],
  );

  return rows[0] || null;
}

async function findByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT id, user_id, platform, platform_user_id, platform_username, is_verified, verified_at, created_at, updated_at
     FROM user_platform_identities
     WHERE user_id = ?
     ORDER BY id ASC`,
    [userId],
  );

  return rows;
}

async function upsertIdentity({ userId, platform, platformUserId, platformUsername, isVerified, verifiedAt }) {
  await pool.execute(
    `INSERT INTO user_platform_identities (
      user_id,
      platform,
      platform_user_id,
      platform_username,
      is_verified,
      verified_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      platform_user_id = VALUES(platform_user_id),
      platform_username = VALUES(platform_username),
      is_verified = VALUES(is_verified),
      verified_at = VALUES(verified_at),
      updated_at = NOW()`,
    [
      userId,
      platform,
      platformUserId,
      platformUsername || null,
      isVerified ? 1 : 0,
      verifiedAt || null,
    ],
  );
}

module.exports = {
  findByPlatformUserId,
  findByUserId,
  upsertIdentity,
};
