#!/usr/bin/env node
require('../src/config/env');

const { pool } = require('../src/config/database');

function parsePairs(raw) {
  if (!raw) {
    return { kind: 'empty', pairs: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item) => item && typeof item === 'object' && item.leftOptionId != null && item.rightOptionId != null)) {
      return {
        kind: 'pairs',
        pairs: parsed.map((pair) => ({ leftOptionId: Number(pair.leftOptionId), rightOptionId: Number(pair.rightOptionId) })),
      };
    }

    if (Array.isArray(parsed) && parsed.every((item) => Number.isInteger(Number(item)))) {
      return { kind: 'ids_only', pairs: [] };
    }

    return { kind: 'unknown', pairs: [] };
  } catch (_error) {
    return { kind: 'invalid_json', pairs: [] };
  }
}

async function main() {
  const applyChanges = process.argv.includes('--apply');

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT ans.id AS answer_id, ans.attempt_id, ans.question_id, ans.selected_option_ids
       FROM assessment_answers ans
       JOIN assessment_questions q ON q.id = ans.question_id
       WHERE q.question_type = 'matching'
       ORDER BY ans.id ASC`
    );

    const affectedAttemptIds = new Set();
    let updatedAnswers = 0;
    let skippedIdsOnly = 0;
    let skippedUnknown = 0;

    if (applyChanges) {
      await connection.beginTransaction();
    }

    for (const row of rows) {
      const parsed = parsePairs(row.selected_option_ids);
      if (parsed.kind === 'ids_only') {
        skippedIdsOnly += 1;
        continue;
      }
      if (parsed.kind !== 'pairs') {
        skippedUnknown += 1;
        continue;
      }

      const isCorrect = parsed.pairs.length > 0 && parsed.pairs.every((pair) => pair.leftOptionId === pair.rightOptionId) ? 1 : 0;

      if (applyChanges) {
        await connection.query('UPDATE assessment_answers SET is_correct = ? WHERE id = ?', [isCorrect, row.answer_id]);
      }

      updatedAnswers += 1;
      affectedAttemptIds.add(Number(row.attempt_id));
    }

    let recalculatedAttempts = 0;

    if (applyChanges && affectedAttemptIds.size > 0) {
      for (const attemptId of affectedAttemptIds) {
        const [[stats]] = await connection.query(
          `SELECT
             COUNT(q.id) AS total_questions,
             COALESCE(SUM(CASE WHEN ans.is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct_answers
           FROM assessment_attempts aa
           JOIN assessment_questions q ON q.assessment_id = aa.assessment_id
           LEFT JOIN assessment_answers ans ON ans.attempt_id = aa.id AND ans.question_id = q.id
           WHERE aa.id = ?`,
          [attemptId]
        );

        const totalQuestions = Number(stats.total_questions || 0);
        const correctAnswers = Number(stats.correct_answers || 0);
        const scorePercent = totalQuestions > 0 ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2)) : 0;

        await connection.query(
          `UPDATE assessment_attempts
           SET correct_answers = ?, total_questions = ?, score_percent = ?, updated_at = UTC_TIMESTAMP()
           WHERE id = ?`,
          [correctAnswers, totalQuestions, scorePercent, attemptId]
        );

        recalculatedAttempts += 1;
      }
    }

    if (applyChanges) {
      await connection.commit();
    }

    const report = {
      mode: applyChanges ? 'apply' : 'dry-run',
      scannedMatchingAnswers: rows.length,
      updatableAnswers: updatedAnswers,
      skippedIdsOnlyAnswers: skippedIdsOnly,
      skippedUnknownAnswers: skippedUnknown,
      affectedAttempts: affectedAttemptIds.size,
      recalculatedAttempts,
    };

    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (process.argv.includes('--apply')) {
      await connection.rollback();
    }
    console.error('[matching-recalculate] Ошибка:', error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
