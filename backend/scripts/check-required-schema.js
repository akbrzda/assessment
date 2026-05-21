#!/usr/bin/env node
require("../src/config/env");

const { pool } = require("../src/config/database");

function parseTablesArg() {
  const arg = process.argv.find((item) => item.startsWith("--tables="));
  const raw = arg ? arg.slice("--tables=".length) : "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function main() {
  const requiredTables = parseTablesArg();

  if (requiredTables.length === 0) {
    console.error("[schema-check] Укажите обязательные таблицы через --tables=table1,table2");
    process.exitCode = 1;
    return;
  }

  const [dbRows] = await pool.query("SELECT DATABASE() AS currentDb");
  const currentDb = dbRows?.[0]?.currentDb || "unknown";

  const placeholders = requiredTables.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT table_name AS tableName
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name IN (${placeholders})`,
    requiredTables,
  );

  const existing = new Set(rows.map((row) => String(row.tableName || "").trim()));
  const missing = requiredTables.filter((table) => !existing.has(table));

  if (missing.length > 0) {
    console.error(
      `[schema-check] Схема неактуальна в БД "${currentDb}". Отсутствуют таблицы: ${missing.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  console.info(`[schema-check] Проверка пройдена для БД "${currentDb}". Таблицы на месте: ${requiredTables.join(", ")}`);
}

main()
  .catch((error) => {
    console.error("[schema-check] Ошибка проверки схемы:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
