const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Проверка обязательных переменных окружения
const requiredEnv = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];
for (const envName of requiredEnv) {
  if (!String(process.env[envName] || "").trim()) {
    console.error(`[migrate] Отсутствует переменная окружения: ${envName}`);
    process.exit(1);
  }
}

const dbPort = Number.parseInt(process.env.DB_PORT, 10);
if (!Number.isFinite(dbPort) || dbPort <= 0) {
  console.error("[migrate] DB_PORT должен быть положительным числом");
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4_unicode_ci",
  multipleStatements: true,
  connectionLimit: 1,
});

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function seedJournalIfFirstTime(connection, files) {
  const [[{ cnt }]] = await connection.query("SELECT COUNT(*) AS cnt FROM migrations");
  if (Number(cnt) > 0) return false;

  // Проверяем, есть ли уже основные таблицы (база не пустая)
  const [[{ tableExists }]] = await connection.query(
    "SELECT COUNT(*) AS tableExists FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'",
  );
  if (!Number(tableExists)) return false;

  // База существующая, журнал пустой — первичная инициализация
  console.info("[migrate] Обнаружена существующая схема без журнала — инициализация журнала миграций...");
  for (const file of files) {
    await connection.query("INSERT IGNORE INTO migrations (name) VALUES (?)", [file]);
    console.info(`[migrate]   зафиксирована как применённая: ${file}`);
  }
  console.info("[migrate] Журнал инициализирован. Новые миграции будут применяться при следующем запуске.");
  return true;
}

async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, "migrations");

  if (!fs.existsSync(migrationsDir)) {
    console.info("[migrate] Папка migrations не найдена — пропускаем");
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (!files.length) {
    console.info("[migrate] SQL-файлы миграций не найдены");
    return;
  }

  const connection = await pool.getConnection();
  try {
    await ensureMigrationsTable(connection);

    const seeded = await seedJournalIfFirstTime(connection, files);
    if (seeded) return;

    const [rows] = await connection.query("SELECT name FROM migrations ORDER BY id ASC");
    const applied = new Set(rows.map((r) => r.name));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.info(`[migrate]   пропущена (уже выполнена): ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      console.info(`[migrate]   выполнение: ${file} ...`);

      try {
        await connection.beginTransaction();
        await connection.query(sql);
        await connection.query("INSERT INTO migrations (name) VALUES (?)", [file]);
        await connection.commit();
        console.info(`[migrate]    выполнена: ${file}`);
        count++;
      } catch (err) {
        try {
          await connection.rollback();
        } catch {}
        throw new Error(`Ошибка в миграции ${file}: ${err.message}`);
      }
    }

    if (count === 0) {
      console.info("[migrate] Все миграции уже применены");
    } else {
      console.info(`[migrate] Выполнено миграций: ${count}`);
    }
  } finally {
    connection.release();
  }
}

(async () => {
  try {
    await runMigrations();
    process.exit(0);
  } catch (err) {
    console.error("[migrate] Ошибка:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
