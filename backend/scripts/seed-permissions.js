const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

function getConnectionConfig() {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4_unicode_ci",
  };
}

async function seedPermissions() {
  const connection = await mysql.createConnection(getConnectionConfig());
  try {
    const [modules] = await connection.query("SELECT code, name FROM system_modules WHERE is_active = 1 ORDER BY id ASC");
    let inserted = 0;

    for (const moduleRow of modules) {
      const [result] = await connection.query(
        `INSERT IGNORE INTO permissions (module_code, entity_code, action_code, description, is_active)
         VALUES (?, 'module', 'access', ?, 1)`,
        [moduleRow.code, `Доступ к модулю ${moduleRow.name || moduleRow.code}`],
      );
      inserted += Number(result.affectedRows || 0);
    }

    const invitationCrudPermissions = [
      { actionCode: "read", description: "Просмотр приглашений" },
      { actionCode: "create", description: "Создание приглашений" },
      { actionCode: "update", description: "Редактирование приглашений" },
      { actionCode: "delete", description: "Удаление приглашений" },
    ];

    for (const permission of invitationCrudPermissions) {
      const [result] = await connection.query(
        `INSERT IGNORE INTO permissions (module_code, entity_code, action_code, description, is_active)
         VALUES ('invitations', 'invitation', ?, ?, 1)`,
        [permission.actionCode, permission.description],
      );
      inserted += Number(result.affectedRows || 0);
    }

    console.log(`[seed-permissions] Готово. Добавлено записей: ${inserted}`);
  } finally {
    await connection.end();
  }
}

seedPermissions().catch((error) => {
  console.error("[seed-permissions] Ошибка:", error.message);
  process.exit(1);
});
