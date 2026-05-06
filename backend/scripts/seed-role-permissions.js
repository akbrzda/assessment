const path = require("path");
const mysql = require("mysql2/promise");
const { ROLE_DEFAULT_MODULES } = require("../src/config/roleModules");
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

async function seedRolePermissions() {
  const connection = await mysql.createConnection(getConnectionConfig());
  try {
    const [roles] = await connection.query("SELECT id, name FROM roles");
    const [permissions] = await connection.query(
      "SELECT id, module_code FROM permissions WHERE entity_code = 'module' AND action_code = 'access' AND is_active = 1",
    );

    const permissionByModule = new Map();
    for (const permission of permissions) {
      permissionByModule.set(permission.module_code, permission.id);
    }

    let inserted = 0;

    for (const role of roles) {
      const allowedModules = ROLE_DEFAULT_MODULES[role.name];
      if (!allowedModules || allowedModules.length === 0) {
        continue;
      }

      let permissionIds = [];
      if (allowedModules.includes("*")) {
        permissionIds = permissions.map((item) => item.id);
      } else {
        permissionIds = allowedModules.map((moduleCode) => permissionByModule.get(moduleCode)).filter(Boolean);
      }

      for (const permissionId of permissionIds) {
        const [result] = await connection.query(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id, effect)
           VALUES (?, ?, 'allow')`,
          [role.id, permissionId],
        );
        inserted += Number(result.affectedRows || 0);
      }
    }

    console.log(`[seed-role-permissions] Готово. Добавлено записей: ${inserted}`);
  } finally {
    await connection.end();
  }
}

seedRolePermissions().catch((error) => {
  console.error("[seed-role-permissions] Ошибка:", error.message);
  process.exit(1);
});
