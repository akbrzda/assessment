const { pool } = require("../src/config/database");

async function backfillTelegramIdentities() {
  const [result] = await pool.query(
    `INSERT INTO user_platform_identities (user_id, platform, platform_user_id, is_verified, verified_at)
     SELECT u.id, 'telegram', u.telegram_id, 1, NOW()
     FROM users u
     WHERE u.deleted_at IS NULL
       AND u.telegram_id IS NOT NULL
       AND u.telegram_id <> ''
       AND NOT EXISTS (
         SELECT 1
         FROM user_platform_identities upi
         WHERE upi.user_id = u.id
           AND upi.platform = 'telegram'
       )`,
  );
  return Number(result.affectedRows || 0);
}

async function detectPhoneConflicts() {
  const [rows] = await pool.query(
    `SELECT phone_e164, GROUP_CONCAT(id ORDER BY id ASC) AS user_ids, COUNT(*) AS cnt
     FROM users
     WHERE deleted_at IS NULL
       AND phone_verification_status = 'verified'
       AND phone_e164 IS NOT NULL
       AND phone_e164 <> ''
     GROUP BY phone_e164
     HAVING COUNT(*) > 1
     ORDER BY cnt DESC, phone_e164 ASC`,
  );
  return rows.map((row) => ({
    phoneE164: row.phone_e164,
    count: Number(row.cnt || 0),
    userIds: String(row.user_ids || "")
      .split(",")
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0),
  }));
}

async function main() {
  try {
    const inserted = await backfillTelegramIdentities();
    const conflicts = await detectPhoneConflicts();

    console.log(`[Sprint4] Добавлено telegram identity: ${inserted}`);
    if (conflicts.length === 0) {
      console.log("[Sprint4] Конфликтов по подтвержденным телефонам не найдено");
      return;
    }

    console.log(`[Sprint4] Найдено конфликтов по телефонам: ${conflicts.length}`);
    conflicts.forEach((item) => {
      console.log(`- ${item.phoneE164}: users=${item.userIds.join(",")}`);
    });
  } catch (error) {
    console.error("[Sprint4] Ошибка дедупликации identity:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
