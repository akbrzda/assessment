#!/usr/bin/env node
require('../src/config/env');

const fs = require('fs');
const path = require('path');
const config = require('../src/config/env');
const { pool } = require('../src/config/database');

async function loadDbDiagnostics() {
  const [matchingRows] = await pool.query(
    `SELECT q.assessment_id, a.title, COUNT(*) AS matching_questions
     FROM assessment_questions q
     JOIN assessments a ON a.id = q.assessment_id
     WHERE q.question_type = 'matching'
     GROUP BY q.assessment_id, a.title
     ORDER BY q.assessment_id ASC`
  );

  const [matchingAttemptsRows] = await pool.query(
    `SELECT aa.id AS attempt_id, aa.assessment_id, a.title,
            SUM(CASE WHEN q.question_type = 'matching' THEN 1 ELSE 0 END) AS matching_answers,
            SUM(CASE WHEN q.question_type = 'matching' AND ans.selected_option_ids REGEXP '^\\\\[[0-9, ]+\\\\]$' THEN 1 ELSE 0 END) AS probable_legacy_answers
     FROM assessment_attempts aa
     JOIN assessments a ON a.id = aa.assessment_id
     JOIN assessment_answers ans ON ans.attempt_id = aa.id
     JOIN assessment_questions q ON q.id = ans.question_id
     GROUP BY aa.id, aa.assessment_id, a.title
     HAVING matching_answers > 0
     ORDER BY aa.id ASC`
  );

  const [staleInProgressRows] = await pool.query(
    `SELECT aa.id, aa.assessment_id, a.title, aa.user_id, aa.started_at
     FROM assessment_attempts aa
     JOIN assessments a ON a.id = aa.assessment_id
     WHERE aa.status = 'in_progress'
       AND aa.started_at < (UTC_TIMESTAMP() - INTERVAL 1 DAY)
     ORDER BY aa.started_at ASC`
  );

  const [activeInProgressRows] = await pool.query(
    `SELECT a.id, a.title, COUNT(*) AS in_progress_attempts
     FROM assessments a
     JOIN assessment_attempts aa ON aa.assessment_id = a.id AND aa.status = 'in_progress'
     WHERE UTC_TIMESTAMP() BETWEEN a.open_at AND a.close_at
     GROUP BY a.id, a.title
     ORDER BY a.id ASC`
  );

  return {
    matchingAssessments: matchingRows,
    attemptsWithMatchingAnswers: matchingAttemptsRows,
    staleInProgressAttempts: staleInProgressRows,
    assessmentsWithActiveInProgressAttempts: activeInProgressRows,
  };
}

function loadRouteDiagnostics() {
  const routerPath = path.resolve(__dirname, '../../frontend/src/router/index.js');
  const guardPath = path.resolve(__dirname, '../../frontend/src/router/guards/authGuard.js');

  const routerSource = fs.readFileSync(routerPath, 'utf8');
  const guardSource = fs.readFileSync(guardPath, 'utf8');

  return {
    registrationRouteExists: /path:\s*["']\/registration["']/.test(routerSource),
    registrationRedirectExists: /registration/.test(guardSource),
  };
}

function buildSummary({ db, route }) {
  const probableLegacy = db.attemptsWithMatchingAnswers.filter((row) => Number(row.probable_legacy_answers || 0) > 0).length;
  return {
    generatedAtUtc: new Date().toISOString(),
    env: {
      nodeEnv: config.nodeEnv,
      jwtSecretSet: Boolean(process.env.JWT_SECRET),
      jwtRefreshSecretSet: Boolean(process.env.JWT_REFRESH_SECRET),
      allowedOriginsCount: config.allowedOrigins.length,
      allowedOrigins: config.allowedOrigins,
    },
    checks: {
      matchingAssessmentsCount: db.matchingAssessments.length,
      attemptsWithMatchingAnswersCount: db.attemptsWithMatchingAnswers.length,
      attemptsWithProbableLegacyMatchingFormatCount: probableLegacy,
      staleInProgressAttemptsCount: db.staleInProgressAttempts.length,
      activeAssessmentsWithInProgressAttemptsCount: db.assessmentsWithActiveInProgressAttempts.length,
      registrationRouteExists: route.registrationRouteExists,
      registrationRedirectExists: route.registrationRedirectExists,
    },
    details: {
      matchingAssessments: db.matchingAssessments,
      attemptsWithMatchingAnswers: db.attemptsWithMatchingAnswers,
      staleInProgressAttempts: db.staleInProgressAttempts,
      assessmentsWithActiveInProgressAttempts: db.assessmentsWithActiveInProgressAttempts,
    },
  };
}

async function main() {
  let db;
  try {
    db = await loadDbDiagnostics();
  } catch (error) {
    console.error('[phase0] Не удалось собрать диагностику БД:', error.message);
    process.exitCode = 1;
    return;
  }

  const route = loadRouteDiagnostics();
  const summary = buildSummary({ db, route });

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error('[phase0] Критическая ошибка:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
