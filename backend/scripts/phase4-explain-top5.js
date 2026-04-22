#!/usr/bin/env node
require("../src/config/env");

const { pool } = require("../src/config/database");

const EXPLAIN_QUERIES = [
  {
    name: "Список аттестаций пользователя",
    sql: `
      SELECT a.id, a.title, a.open_at, a.close_at
      FROM assessments a
      JOIN assessment_user_assignments aua ON aua.assessment_id = a.id
      WHERE aua.user_id = ?
      ORDER BY a.open_at DESC
      LIMIT 50
    `,
    params: [1],
  },
  {
    name: "Детали аттестации для менеджера",
    sql: `
      SELECT a.id, a.title, a.open_at, a.close_at
      FROM assessments a
      WHERE a.id = ?
      LIMIT 1
    `,
    params: [1],
  },
  {
    name: "Незавершенные попытки пользователя",
    sql: `
      SELECT aa.id, aa.status, aa.started_at
      FROM assessment_attempts aa
      WHERE aa.user_id = ?
      ORDER BY aa.started_at DESC
      LIMIT 50
    `,
    params: [1],
  },
  {
    name: "Назначения пользователя по фильтру аттестации",
    sql: `
      SELECT aua.user_id
      FROM assessment_user_assignments aua
      WHERE aua.user_id = ? AND aua.assessment_id = ?
      LIMIT 1
    `,
    params: [1, 1],
  },
  {
    name: "Просроченные попытки для автозавершения",
    sql: `
      SELECT aa.id
      FROM assessment_attempts aa
      JOIN assessments a ON a.id = aa.assessment_id
      WHERE aa.status = 'in_progress'
        AND a.time_limit_minutes IS NOT NULL
        AND TIMESTAMPDIFF(MINUTE, aa.started_at, UTC_TIMESTAMP()) > a.time_limit_minutes
      LIMIT 100
    `,
    params: [],
  },
];

async function explainQuery(connection, query) {
  const explainSql = `EXPLAIN FORMAT=JSON ${query.sql}`;
  const [rows] = await connection.query(explainSql, query.params);
  const rawPlan = rows?.[0]?.EXPLAIN;

  let parsedPlan = null;
  if (typeof rawPlan === "string") {
    try {
      parsedPlan = JSON.parse(rawPlan);
    } catch {
      parsedPlan = { rawPlan };
    }
  }

  return {
    name: query.name,
    sql: query.sql.trim(),
    params: query.params,
    plan: parsedPlan,
  };
}

async function main() {
  const connection = await pool.getConnection();
  try {
    const results = [];
    for (const query of EXPLAIN_QUERIES) {
      const result = await explainQuery(connection, query);
      results.push(result);
    }

    console.log(JSON.stringify({
      generatedAtUtc: new Date().toISOString(),
      total: results.length,
      explains: results,
    }, null, 2));
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[phase4-explain] Ошибка выполнения EXPLAIN:", error.message);
  process.exitCode = 1;
});
