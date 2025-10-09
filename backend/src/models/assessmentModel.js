const { pool } = require('../config/database');

function toIsoUtc(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const str = String(value).trim();
  if (!str) {
    return null;
  }

  const normalized = str.replace(' ', 'T');
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized);
  const source = hasZone ? normalized : `${normalized}Z`;
  const date = new Date(source);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function mapAssessmentRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    openAt: toIsoUtc(row.open_at),
    closeAt: toIsoUtc(row.close_at),
    timeLimitMinutes: row.time_limit_minutes,
    passScorePercent: row.pass_score_percent,
    maxAttempts: row.max_attempts,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
    status: row.status || null,
    assignedCount: row.assigned_count != null ? Number(row.assigned_count) : null,
    completedCount: row.completed_count != null ? Number(row.completed_count) : null
  };
}

async function createAssessment({ assessment, questions, branchIds, userIds, positionIds, userId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [assessmentResult] = await connection.execute(
      `INSERT INTO assessments
         (title, description, open_at, close_at, time_limit_minutes, pass_score_percent, max_attempts, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [
        assessment.title,
        assessment.description,
        assessment.openAt,
        assessment.closeAt,
        assessment.timeLimitMinutes,
        assessment.passScorePercent,
        assessment.maxAttempts,
        userId,
        userId
      ]
    );

    const assessmentId = assessmentResult.insertId;

    for (let idx = 0; idx < questions.length; idx += 1) {
      const question = questions[idx];
      const [questionResult] = await connection.execute(
        `INSERT INTO assessment_questions (assessment_id, order_index, question_text)
         VALUES (?, ?, ?)`
        , [assessmentId, idx + 1, question.text]
      );
      const questionId = questionResult.insertId;

      const optionValues = question.options.map((option, optionIdx) => [
        questionId,
        optionIdx + 1,
        option.text,
        option.isCorrect ? 1 : 0
      ]);

      await connection.query(
        `INSERT INTO assessment_question_options (question_id, order_index, option_text, is_correct)
         VALUES ?`
        , [optionValues]
      );
    }

    if (Array.isArray(branchIds) && branchIds.length > 0) {
      const values = branchIds.map((id) => [assessmentId, id]);
      await connection.query(
        `INSERT INTO assessment_branch_assignments (assessment_id, branch_id) VALUES ?`
        , [values]
      );
    }

    if (Array.isArray(userIds) && userIds.length > 0) {
      const values = userIds.map((id) => [assessmentId, id]);
      await connection.query(
        `INSERT INTO assessment_user_assignments (assessment_id, user_id) VALUES ?`
        , [values]
      );
    }

    if (Array.isArray(positionIds) && positionIds.length > 0) {
      const values = positionIds.map((id) => [assessmentId, id]);
      await connection.query(
        `INSERT INTO assessment_position_assignments (assessment_id, position_id) VALUES ?`
        , [values]
      );
    }

    await connection.commit();
    return assessmentId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateAssessment(assessmentId, { assessment, questions, branchIds, userIds, positionIds, userId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE assessments
         SET title = ?,
             description = ?,
             open_at = ?,
             close_at = ?,
             time_limit_minutes = ?,
             pass_score_percent = ?,
             max_attempts = ?,
             updated_by = ?
       WHERE id = ?`
      , [
        assessment.title,
        assessment.description,
        assessment.openAt,
        assessment.closeAt,
        assessment.timeLimitMinutes,
        assessment.passScorePercent,
        assessment.maxAttempts,
        userId,
        assessmentId
      ]
    );

    await connection.execute('DELETE FROM assessment_questions WHERE assessment_id = ?', [assessmentId]);
    await connection.execute('DELETE FROM assessment_branch_assignments WHERE assessment_id = ?', [assessmentId]);
    await connection.execute('DELETE FROM assessment_user_assignments WHERE assessment_id = ?', [assessmentId]);
    await connection.execute('DELETE FROM assessment_position_assignments WHERE assessment_id = ?', [assessmentId]);

    for (let idx = 0; idx < questions.length; idx += 1) {
      const question = questions[idx];
      const [questionResult] = await connection.execute(
        `INSERT INTO assessment_questions (assessment_id, order_index, question_text)
         VALUES (?, ?, ?)`
        , [assessmentId, idx + 1, question.text]
      );
      const questionId = questionResult.insertId;

      const optionValues = question.options.map((option, optionIdx) => [
        questionId,
        optionIdx + 1,
        option.text,
        option.isCorrect ? 1 : 0
      ]);

      await connection.query(
        `INSERT INTO assessment_question_options (question_id, order_index, option_text, is_correct)
         VALUES ?`
        , [optionValues]
      );
    }

    if (Array.isArray(branchIds) && branchIds.length > 0) {
      const values = branchIds.map((id) => [assessmentId, id]);
      await connection.query(
        `INSERT INTO assessment_branch_assignments (assessment_id, branch_id) VALUES ?`
        , [values]
      );
    }

    if (Array.isArray(userIds) && userIds.length > 0) {
      const values = userIds.map((id) => [assessmentId, id]);
      await connection.query(
        `INSERT INTO assessment_user_assignments (assessment_id, user_id) VALUES ?`
        , [values]
      );
    }

    if (Array.isArray(positionIds) && positionIds.length > 0) {
      const values = positionIds.map((id) => [assessmentId, id]);
      await connection.query(
        `INSERT INTO assessment_position_assignments (assessment_id, position_id) VALUES ?`
        , [values]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteAssessment(assessmentId) {
  await pool.execute('DELETE FROM assessments WHERE id = ?', [assessmentId]);
}

async function listAssessmentsForManager({ userId, roleName }) {
  const params = [];
  let whereClause = '';
  if (roleName === 'manager') {
    whereClause = 'WHERE a.created_by = ?';
    params.push(userId);
  }

  const [rows] = await pool.execute(
    `SELECT
       a.id,
       a.title,
       a.description,
       a.open_at,
       a.close_at,
       a.time_limit_minutes,
       a.pass_score_percent,
       a.max_attempts,
       a.created_by,
       a.updated_by,
       a.created_at,
       a.updated_at,
       CASE
         WHEN UTC_TIMESTAMP() < a.open_at THEN 'pending'
         WHEN UTC_TIMESTAMP() BETWEEN a.open_at AND a.close_at THEN 'active'
         ELSE 'closed'
       END AS status,
       COALESCE((
         SELECT COUNT(DISTINCT assigned.user_id)
         FROM (
           SELECT aua.user_id AS user_id
           FROM assessment_user_assignments aua
           WHERE aua.assessment_id = a.id
           UNION
           SELECT u.id AS user_id
           FROM assessment_position_assignments apa
           JOIN users u ON u.position_id = apa.position_id
           WHERE apa.assessment_id = a.id
           UNION
           SELECT u.id AS user_id
           FROM assessment_branch_assignments aba
           JOIN users u ON u.branch_id = aba.branch_id
           WHERE aba.assessment_id = a.id
         ) AS assigned
       ), 0) AS assigned_count,
       COALESCE((
         SELECT COUNT(DISTINCT aa.user_id)
         FROM assessment_attempts aa
         WHERE aa.assessment_id = a.id
           AND aa.status = 'completed'
       ), 0) AS completed_count
     FROM assessments a
     ${whereClause}
     ORDER BY a.created_at DESC`
    , params
  );

  return rows.map(mapAssessmentRow);
}

async function findAssessmentByIdForManager(assessmentId, { userId, roleName }) {
  const params = [assessmentId];
  let whereClause = 'WHERE a.id = ?';
  if (roleName === 'manager') {
    whereClause += ' AND a.created_by = ?';
    params.push(userId);
  }

  const [rows] = await pool.execute(
    `SELECT
       a.id,
       a.title,
       a.description,
       a.open_at,
       a.close_at,
       a.time_limit_minutes,
       a.pass_score_percent,
       a.max_attempts,
       a.created_by,
       a.updated_by,
       a.created_at,
       a.updated_at,
       CASE
         WHEN UTC_TIMESTAMP() < a.open_at THEN 'pending'
         WHEN UTC_TIMESTAMP() BETWEEN a.open_at AND a.close_at THEN 'active'
         ELSE 'closed'
       END AS status,
       COALESCE((
         SELECT COUNT(DISTINCT assigned.user_id)
         FROM (
           SELECT aua.user_id AS user_id
           FROM assessment_user_assignments aua
           WHERE aua.assessment_id = a.id
           UNION
           SELECT u.id AS user_id
           FROM assessment_position_assignments apa
           JOIN users u ON u.position_id = apa.position_id
           WHERE apa.assessment_id = a.id
           UNION
           SELECT u.id AS user_id
           FROM assessment_branch_assignments aba
           JOIN users u ON u.branch_id = aba.branch_id
           WHERE aba.assessment_id = a.id
         ) AS assigned
       ), 0) AS assigned_count,
       COALESCE((
         SELECT COUNT(DISTINCT aa.user_id)
         FROM assessment_attempts aa
         WHERE aa.assessment_id = a.id
           AND aa.status = 'completed'
       ), 0) AS completed_count,
       (
         SELECT COUNT(*)
         FROM assessment_attempts aa
         WHERE aa.assessment_id = a.id
       ) AS attempts_total
     FROM assessments a
     ${whereClause}
     LIMIT 1`
    , params
  );

  if (!rows.length) {
    return null;
  }

  const base = mapAssessmentRow(rows[0]);
  base.attemptsTotal = Number(rows[0].attempts_total || 0);

  const [questionRows] = await pool.execute(
    `SELECT
       q.id,
       q.assessment_id,
       q.order_index,
       q.question_text,
       o.id AS option_id,
       o.order_index AS option_order,
       o.option_text,
       o.is_correct
     FROM assessment_questions q
     LEFT JOIN assessment_question_options o ON o.question_id = q.id
     WHERE q.assessment_id = ?
     ORDER BY q.order_index ASC, o.order_index ASC`
    , [assessmentId]
  );

  const questionMap = new Map();
  questionRows.forEach((row) => {
    if (!questionMap.has(row.id)) {
      questionMap.set(row.id, {
        id: row.id,
        order: row.order_index,
        text: row.question_text,
        options: [],
        correctIndex: null
      });
    }
    if (row.option_id) {
      const option = {
        id: row.option_id,
        order: row.option_order,
        text: row.option_text,
        isCorrect: Boolean(row.is_correct)
      };

      const question = questionMap.get(row.id);
      question.options.push(option);

      if (option.isCorrect) {
        question.correctIndex = option.order != null ? Number(option.order) : question.options.length - 1;
      }
    }
  });

  base.questions = Array.from(questionMap.values());

  const [positionRows] = await pool.execute(
    `SELECT apa.position_id AS id, p.name
       FROM assessment_position_assignments apa
       JOIN positions p ON p.id = apa.position_id
      WHERE apa.assessment_id = ?
      ORDER BY p.name ASC`
    , [assessmentId]
  );
  base.positions = positionRows;

  const [branchRows] = await pool.execute(
    `SELECT aba.branch_id AS id, b.name
       FROM assessment_branch_assignments aba
       JOIN branches b ON b.id = aba.branch_id
      WHERE aba.assessment_id = ?
      ORDER BY b.name ASC`
    , [assessmentId]
  );
  base.branches = branchRows;

  const [userRows] = await pool.execute(
    `SELECT aua.user_id AS id,
            u.first_name,
            u.last_name,
            u.branch_id,
            b.name AS branch_name,
            u.position_id,
            p.name AS position_name
       FROM assessment_user_assignments aua
       JOIN users u ON u.id = aua.user_id
       LEFT JOIN branches b ON b.id = u.branch_id
       LEFT JOIN positions p ON p.id = u.position_id
      WHERE aua.assessment_id = ?
      ORDER BY u.last_name ASC, u.first_name ASC`
    , [assessmentId]
  );
  base.users = userRows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    branchId: row.branch_id,
    branchName: row.branch_name,
    positionId: row.position_id,
    positionName: row.position_name
  }));

  const [participantRows] = await pool.execute(
    `SELECT
       assigned.user_id AS id,
       u.first_name,
       u.last_name,
       b.name AS branch_name,
       p.name AS position_name,
       best.attempt_number,
       best.status AS best_status,
       best.score_percent,
       best.correct_answers,
       best.total_questions,
       best.completed_at,
       best.time_spent_seconds
     FROM (
       SELECT aua.user_id
       FROM assessment_user_assignments aua
       WHERE aua.assessment_id = ?
       UNION
       SELECT u.id AS user_id
       FROM assessment_position_assignments apa
       JOIN users u ON u.position_id = apa.position_id
       WHERE apa.assessment_id = ?
       UNION
       SELECT u.id AS user_id
       FROM assessment_branch_assignments aba
       JOIN users u ON u.branch_id = aba.branch_id
       WHERE aba.assessment_id = ?
     ) AS assigned
     JOIN users u ON u.id = assigned.user_id
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN positions p ON p.id = u.position_id
     LEFT JOIN (
       SELECT ranked.assessment_id,
              ranked.user_id,
              ranked.attempt_number,
              ranked.status,
              ranked.score_percent,
              ranked.correct_answers,
              ranked.total_questions,
              ranked.completed_at,
              ranked.time_spent_seconds
       FROM (
         SELECT aa.assessment_id,
                aa.user_id,
                aa.attempt_number,
                aa.status,
                aa.score_percent,
                aa.correct_answers,
                aa.total_questions,
                aa.completed_at,
                aa.time_spent_seconds,
                ROW_NUMBER() OVER (
                  PARTITION BY aa.user_id
                  ORDER BY COALESCE(aa.score_percent, -1) DESC,
                           aa.attempt_number DESC,
                           aa.completed_at DESC
                ) AS rn
         FROM assessment_attempts aa
         WHERE aa.assessment_id = ?
       ) AS ranked
       WHERE ranked.rn = 1
     ) AS best
       ON best.assessment_id = ?
      AND best.user_id = assigned.user_id
     ORDER BY u.last_name ASC, u.first_name ASC`
    , [assessmentId, assessmentId, assessmentId, assessmentId, assessmentId, assessmentId]
  );

  base.participants = participantRows.map((row) => {
    let status = 'not_started';
    if (row.best_status === 'completed') {
      status = 'completed';
    } else if (row.best_status === 'in_progress') {
      status = 'in_progress';
    } else if (row.best_status === 'cancelled') {
      status = 'cancelled';
    }
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      branchName: row.branch_name,
      positionName: row.position_name,
      status,
      attemptNumber: row.attempt_number ? Number(row.attempt_number) : null,
      scorePercent: row.score_percent != null ? Number(row.score_percent) : null,
      correctAnswers: row.correct_answers != null ? Number(row.correct_answers) : null,
      totalQuestions: row.total_questions != null ? Number(row.total_questions) : null,
      completedAt: toIsoUtc(row.completed_at),
      timeSpentSeconds: row.time_spent_seconds != null ? Number(row.time_spent_seconds) : null
    };
  });

  return base;
}

async function hasAttempts(assessmentId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM assessment_attempts WHERE assessment_id = ?'
    , [assessmentId]
  );
  return Number(rows[0].total || 0) > 0;
}

async function listAssignableUsers({ roleName, branchId }) {
  const params = [];
  let whereClause = '';
  if (roleName === 'manager') {
    whereClause = 'WHERE u.branch_id = ?';
    params.push(branchId);
  }

  const [rows] = await pool.execute(
    `SELECT
       u.id,
       u.first_name,
       u.last_name,
       u.branch_id,
       b.name AS branch_name,
       u.position_id,
       p.name AS position_name
     FROM users u
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN positions p ON p.id = u.position_id
     ${whereClause}
     ORDER BY u.last_name ASC, u.first_name ASC`
    , params
  );

  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    branchId: row.branch_id,
    branchName: row.branch_name,
    positionId: row.position_id,
    positionName: row.position_name
  }));
}

async function listAssignablePositions({ roleName, branchId }) {
  if (roleName === 'manager') {
    const [rows] = await pool.execute(
      `SELECT DISTINCT p.id, p.name
         FROM positions p
         JOIN users u ON u.position_id = p.id
        WHERE u.branch_id = ?
        ORDER BY p.name ASC`
      , [branchId]
    );
    return rows;
  }

  const [rows] = await pool.execute('SELECT id, name FROM positions ORDER BY name ASC');
  return rows;
}

async function listAssignableBranches({ roleName, branchId }) {
  if (roleName === 'manager') {
    const [rows] = await pool.execute('SELECT id, name FROM branches WHERE id = ? LIMIT 1', [branchId]);
    return rows;
  }

  const [rows] = await pool.execute('SELECT id, name FROM branches ORDER BY name ASC');
  return rows;
}

async function listAssignedUserIds(assessmentId) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT assigned.user_id
       FROM (
         SELECT aua.user_id AS user_id
         FROM assessment_user_assignments aua
         WHERE aua.assessment_id = ?
         UNION
         SELECT u.id AS user_id
         FROM assessment_position_assignments apa
         JOIN users u ON u.position_id = apa.position_id
         WHERE apa.assessment_id = ?
         UNION
         SELECT u.id AS user_id
         FROM assessment_branch_assignments aba
         JOIN users u ON u.branch_id = aba.branch_id
         WHERE aba.assessment_id = ?
       ) AS assigned`
    , [assessmentId, assessmentId, assessmentId]
  );
  return rows.map((row) => row.user_id);
}

async function listAssessmentsForUser(userId) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT
       a.id,
       a.title,
       a.description,
       a.open_at,
       a.close_at,
       a.time_limit_minutes,
       a.pass_score_percent,
       a.max_attempts,
       CASE
         WHEN UTC_TIMESTAMP() < a.open_at THEN 'pending'
         WHEN UTC_TIMESTAMP() BETWEEN a.open_at AND a.close_at THEN 'active'
         ELSE 'closed'
       END AS status,
       aa.id AS attempt_id,
       aa.attempt_number,
       aa.status AS attempt_status,
       aa.score_percent,
       aa.started_at,
       aa.completed_at,
       best_attempts.best_score_percent
     FROM assessments a
     JOIN (
       SELECT assessment_id
       FROM assessment_user_assignments
       WHERE user_id = ?
       UNION
       SELECT apa.assessment_id
       FROM assessment_position_assignments apa
       JOIN users u ON u.position_id = apa.position_id
       WHERE u.id = ?
       UNION
       SELECT aba.assessment_id
       FROM assessment_branch_assignments aba
       JOIN users u ON u.branch_id = aba.branch_id
       WHERE u.id = ?
     ) assigned ON assigned.assessment_id = a.id
     LEFT JOIN (
       SELECT aa1.*
       FROM assessment_attempts aa1
       JOIN (
         SELECT assessment_id, MAX(attempt_number) AS last_attempt
         FROM assessment_attempts
         WHERE user_id = ?
         GROUP BY assessment_id
       ) summary
       ON summary.assessment_id = aa1.assessment_id
       AND summary.last_attempt = aa1.attempt_number
       WHERE aa1.user_id = ?
     ) aa ON aa.assessment_id = a.id
     LEFT JOIN (
        SELECT assessment_id, MAX(score_percent) AS best_score_percent
        FROM assessment_attempts
        WHERE user_id = ?
        GROUP BY assessment_id
     ) best_attempts ON best_attempts.assessment_id = a.id
      ORDER BY a.open_at ASC`
    , [userId, userId, userId, userId, userId, userId]
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    openAt: toIsoUtc(row.open_at),
    closeAt: toIsoUtc(row.close_at),
    timeLimitMinutes: row.time_limit_minutes != null ? Number(row.time_limit_minutes) : null,
    passScorePercent: row.pass_score_percent != null ? Number(row.pass_score_percent) : null,
    maxAttempts: row.max_attempts != null ? Number(row.max_attempts) : null,
    status: row.status,
    lastAttemptId: row.attempt_id || null,
    lastAttemptNumber: row.attempt_number ? Number(row.attempt_number) : null,
    lastAttemptStatus: row.attempt_status || null,
    lastScorePercent: row.score_percent != null ? Number(row.score_percent) : null,
    lastCompletedAt: toIsoUtc(row.completed_at),
    lastStartedAt: toIsoUtc(row.started_at),
    bestScorePercent: row.best_score_percent != null ? Number(row.best_score_percent) : null,
    timeRemainingSeconds: (() => {
      const timeLimitMinutes = row.time_limit_minutes != null ? Number(row.time_limit_minutes) : null;
      const startedAtIso = toIsoUtc(row.started_at);
      if (row.attempt_status !== 'in_progress' || timeLimitMinutes == null || !startedAtIso) {
        return null;
      }
      if (!startedAtIso) {
        return null;
      }
      const startedAtMs = Date.parse(startedAtIso);
      if (!Number.isFinite(startedAtMs)) {
        return null;
      }
      const limitSeconds = timeLimitMinutes * 60;
      const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
      return Math.max(limitSeconds - elapsedSeconds, 0);
    })()
  }));
}

async function getAssessmentForUser(assessmentId, userId) {
  const [rows] = await pool.execute(
    `SELECT
       a.id,
       a.title,
       a.description,
       a.open_at,
       a.close_at,
       a.time_limit_minutes,
       a.pass_score_percent,
       a.max_attempts,
       CASE
         WHEN UTC_TIMESTAMP() < a.open_at THEN 'pending'
         WHEN UTC_TIMESTAMP() BETWEEN a.open_at AND a.close_at THEN 'active'
         ELSE 'closed'
       END AS status
     FROM assessments a
     WHERE a.id = ?
       AND EXISTS (
         SELECT 1 FROM assessment_user_assignments aua WHERE aua.assessment_id = a.id AND aua.user_id = ?
         UNION
         SELECT 1
         FROM assessment_position_assignments apa
         JOIN users u ON u.position_id = apa.position_id
         WHERE apa.assessment_id = a.id AND u.id = ?
         UNION
         SELECT 1
         FROM assessment_branch_assignments aba
         JOIN users u ON u.branch_id = aba.branch_id
         WHERE aba.assessment_id = a.id AND u.id = ?
       )
     LIMIT 1`
    , [assessmentId, userId, userId, userId]
  );

  if (!rows.length) {
    return null;
  }

  const base = {
    id: rows[0].id,
    title: rows[0].title,
    description: rows[0].description,
    openAt: toIsoUtc(rows[0].open_at),
    closeAt: toIsoUtc(rows[0].close_at),
    timeLimitMinutes: rows[0].time_limit_minutes != null ? Number(rows[0].time_limit_minutes) : null,
    passScorePercent: rows[0].pass_score_percent != null ? Number(rows[0].pass_score_percent) : null,
    maxAttempts: rows[0].max_attempts != null ? Number(rows[0].max_attempts) : null,
    status: rows[0].status
  };

  const [questionRows] = await pool.execute(
    `SELECT
       q.id,
       q.order_index,
       q.question_text,
       o.id AS option_id,
       o.order_index AS option_order,
       o.option_text,
       o.is_correct
     FROM assessment_questions q
     LEFT JOIN assessment_question_options o ON o.question_id = q.id
     WHERE q.assessment_id = ?
     ORDER BY q.order_index ASC, o.order_index ASC`
    , [assessmentId]
  );

  const questionMap = new Map();
  questionRows.forEach((row) => {
    if (!questionMap.has(row.id)) {
      questionMap.set(row.id, {
        id: row.id,
        order: row.order_index,
        text: row.question_text,
        options: []
      });
    }
    if (row.option_id) {
      questionMap.get(row.id).options.push({
        id: row.option_id,
        order: row.option_order,
        text: row.option_text
      });
    }
  });

  base.questions = Array.from(questionMap.values());

  const [attemptRows] = await pool.execute(
    `SELECT id, attempt_number, status, started_at, completed_at, score_percent
       FROM assessment_attempts
      WHERE assessment_id = ? AND user_id = ?
      ORDER BY attempt_number DESC
      LIMIT 1`
    , [assessmentId, userId]
  );

  if (attemptRows.length) {
    const attempt = attemptRows[0];
    const timeLimitMinutes = base.timeLimitMinutes;
    let remainingSeconds = null;
    const attemptStartedAt = toIsoUtc(attempt.started_at);
    if (attempt.status === 'in_progress' && timeLimitMinutes != null && attemptStartedAt) {
      const startedAtMs = Date.parse(attemptStartedAt);
      if (Number.isFinite(startedAtMs)) {
        const limitSeconds = Number(timeLimitMinutes) * 60;
        const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
        remainingSeconds = Math.max(limitSeconds - elapsedSeconds, 0);
      }
    }
    base.latestAttempt = {
      id: attempt.id,
      attemptNumber: Number(attempt.attempt_number),
      status: attempt.status,
      startedAt: attemptStartedAt,
      completedAt: toIsoUtc(attempt.completed_at),
      scorePercent: attempt.score_percent != null ? Number(attempt.score_percent) : null,
      remainingSeconds
    };

    if (attempt.status === 'in_progress') {
      const [answerRows] = await pool.execute(
        'SELECT question_id, option_id FROM assessment_answers WHERE attempt_id = ?'
        , [attempt.id]
      );
      const answerMap = new Map(answerRows.map((row) => [row.question_id, row.option_id]));
      base.questions = base.questions.map((question) => ({
        ...question,
        selectedOptionId: answerMap.get(question.id) || null
      }));
    }
  }

  return base;
}

async function createAttempt(assessment, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingAttemptRows] = await connection.execute(
      `SELECT id, attempt_number, started_at
         FROM assessment_attempts
        WHERE assessment_id = ? AND user_id = ? AND status = 'in_progress'
        LIMIT 1`
      , [assessment.id, userId]
    );

    if (existingAttemptRows.length) {
      const existing = existingAttemptRows[0];
      await connection.commit();
      return {
        id: existing.id,
        attemptNumber: Number(existing.attempt_number),
        timeLimitMinutes: assessment.timeLimitMinutes != null ? Number(assessment.timeLimitMinutes) : null,
        maxAttempts: assessment.maxAttempts != null ? Number(assessment.maxAttempts) : null,
        createdBy: assessment.created_by,
        title: assessment.title,
        startedAt: toIsoUtc(existing.started_at)
      };
    }

    const [assessmentRow] = await connection.execute(
      'SELECT id, title, open_at, close_at, max_attempts, time_limit_minutes, created_by FROM assessments WHERE id = ? FOR UPDATE',
      [assessment.id]
    );

    if (!assessmentRow.length) {
      const error = new Error('Аттестация не найдена');
      error.status = 404;
      throw error;
    }

    const row = assessmentRow[0];
    const now = new Date();
    const openAtIso = toIsoUtc(row.open_at);
    const closeAtIso = toIsoUtc(row.close_at);
    if (openAtIso && new Date(openAtIso) > now) {
      const error = new Error('Аттестация ещё не открыта');
      error.status = 400;
      throw error;
    }
    if (closeAtIso && new Date(closeAtIso) < now) {
      const error = new Error('Аттестация уже закрыта');
      error.status = 400;
      throw error;
    }

    const [attemptCountRows] = await connection.execute(
      'SELECT COUNT(*) AS total FROM assessment_attempts WHERE assessment_id = ? AND user_id = ?',
      [assessment.id, userId]
    );
    const attemptNumber = Number(attemptCountRows[0].total || 0) + 1;
    if (row.max_attempts != null && attemptNumber > Number(row.max_attempts)) {
      const error = new Error('Превышено количество попыток');
      error.status = 400;
      throw error;
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO assessment_attempts (assessment_id, user_id, attempt_number, status, started_at, created_at, updated_at)
       VALUES (?, ?, ?, 'in_progress', UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [assessment.id, userId, attemptNumber]
    );

    await connection.commit();

    const timeLimitMinutes = row.time_limit_minutes != null ? Number(row.time_limit_minutes) : null;

    return {
      id: insertResult.insertId,
      attemptNumber,
      timeLimitMinutes,
      remainingSeconds: timeLimitMinutes != null ? timeLimitMinutes * 60 : null,
      maxAttempts: row.max_attempts != null ? Number(row.max_attempts) : null,
      createdBy: row.created_by,
      title: row.title,
      startedAt: new Date().toISOString()
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function saveAnswer({ attemptId, userId, questionId, optionId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [attemptRows] = await connection.execute(
      'SELECT id, assessment_id, status FROM assessment_attempts WHERE id = ? AND user_id = ? FOR UPDATE',
      [attemptId, userId]
    );
    if (!attemptRows.length) {
      const error = new Error('Попытка не найдена');
      error.status = 404;
      throw error;
    }
    const attempt = attemptRows[0];
    if (attempt.status !== 'in_progress') {
      const error = new Error('Попытка уже завершена');
      error.status = 400;
      throw error;
    }

    const [questionRows] = await connection.execute(
      'SELECT id FROM assessment_questions WHERE id = ? AND assessment_id = ?',
      [questionId, attempt.assessment_id]
    );
    if (!questionRows.length) {
      const error = new Error('Вопрос не найден');
      error.status = 404;
      throw error;
    }

    const [optionRows] = await connection.execute(
      'SELECT id, is_correct FROM assessment_question_options WHERE id = ? AND question_id = ?',
      [optionId, questionId]
    );
    if (!optionRows.length) {
      const error = new Error('Ответ не найден');
      error.status = 404;
      throw error;
    }

    const isCorrect = optionRows[0].is_correct ? 1 : 0;

    await connection.execute(
      `INSERT INTO assessment_answers (attempt_id, question_id, option_id, is_correct, answered_at, created_at)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE option_id = VALUES(option_id), is_correct = VALUES(is_correct), answered_at = UTC_TIMESTAMP()`
      , [attemptId, questionId, optionId, isCorrect]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function completeAttempt(attemptId, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [attemptRows] = await connection.execute(
      'SELECT id, assessment_id, status, started_at FROM assessment_attempts WHERE id = ? AND user_id = ? FOR UPDATE',
      [attemptId, userId]
    );
    if (!attemptRows.length) {
      const error = new Error('Попытка не найдена');
      error.status = 404;
      throw error;
    }
    const attempt = attemptRows[0];
    if (attempt.status !== 'in_progress') {
      const error = new Error('Попытка уже завершена');
      error.status = 400;
      throw error;
    }

    const [assessmentRows] = await connection.execute(
      'SELECT id, title, pass_score_percent, time_limit_minutes, created_by FROM assessments WHERE id = ?',
      [attempt.assessment_id]
    );
    if (!assessmentRows.length) {
      const error = new Error('Аттестация не найдена');
      error.status = 404;
      throw error;
    }
    const assessment = assessmentRows[0];

    const [[questionRow]] = await connection.execute(
      'SELECT COUNT(*) AS total FROM assessment_questions WHERE assessment_id = ?',
      [assessment.id]
    );
    const totalQuestions = Number(questionRow.total || 0);

    const [[correctRow]] = await connection.execute(
      'SELECT COUNT(*) AS total FROM assessment_answers WHERE attempt_id = ? AND is_correct = 1',
      [attemptId]
    );
    const correctAnswers = Number(correctRow.total || 0);

    const scorePercent = totalQuestions > 0 ? Number(((correctAnswers / totalQuestions) * 100).toFixed(2)) : 0;

    await connection.execute(
      `UPDATE assessment_attempts
         SET status = 'completed',
             score_percent = ?,
             correct_answers = ?,
             total_questions = ?,
             time_spent_seconds = TIMESTAMPDIFF(SECOND, started_at, UTC_TIMESTAMP()),
             completed_at = UTC_TIMESTAMP(),
             updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [scorePercent, correctAnswers, totalQuestions, attemptId]
    );

    const [[updatedAttempt]] = await connection.execute(
      'SELECT score_percent, correct_answers, total_questions, time_spent_seconds FROM assessment_attempts WHERE id = ?',
      [attemptId]
    );

    await connection.commit();

    return {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        passScorePercent: assessment.pass_score_percent != null ? Number(assessment.pass_score_percent) : 0,
        createdBy: assessment.created_by,
        timeLimitMinutes: assessment.time_limit_minutes != null ? Number(assessment.time_limit_minutes) : null
      },
      attempt: {
        id: attemptId,
        scorePercent: updatedAttempt.score_percent != null ? Number(updatedAttempt.score_percent) : scorePercent,
        correctAnswers: updatedAttempt.correct_answers != null ? Number(updatedAttempt.correct_answers) : correctAnswers,
        totalQuestions: updatedAttempt.total_questions != null ? Number(updatedAttempt.total_questions) : totalQuestions,
        timeSpentSeconds: updatedAttempt.time_spent_seconds != null ? Number(updatedAttempt.time_spent_seconds) : null,
        attemptNumber: Number(attempt.attempt_number)
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getAttemptResult({ assessmentId, attemptId, userId }) {
  const [attemptRows] = await pool.execute(
    `SELECT aa.id,
            aa.assessment_id,
            aa.user_id,
            aa.attempt_number,
            aa.status,
            aa.score_percent,
            aa.correct_answers,
            aa.total_questions,
            aa.time_spent_seconds,
            aa.started_at,
            aa.completed_at,
            a.title,
            a.pass_score_percent,
            a.max_attempts
       FROM assessment_attempts aa
       JOIN assessments a ON a.id = aa.assessment_id
      WHERE aa.id = ?
        AND aa.assessment_id = ?
        AND aa.user_id = ?
      LIMIT 1`
    , [attemptId, assessmentId, userId]
  );

  if (!attemptRows.length) {
    return null;
  }

  const attempt = attemptRows[0];

  const [questionRows] = await pool.execute(
    `SELECT
       q.id,
       q.order_index,
       q.question_text,
       selected.option_id AS selected_option_id,
       selected.option_text AS selected_option_text,
       selected.is_correct AS selected_is_correct,
       correct.option_id AS correct_option_id,
       correct.option_text AS correct_option_text
     FROM assessment_questions q
     LEFT JOIN (
       SELECT aa.question_id,
              aa.option_id,
              o.option_text,
              aa.is_correct
         FROM assessment_answers aa
         LEFT JOIN assessment_question_options o ON o.id = aa.option_id
        WHERE aa.attempt_id = ?
     ) selected ON selected.question_id = q.id
     LEFT JOIN (
       SELECT o.question_id,
              o.id AS option_id,
              o.option_text
         FROM assessment_question_options o
        WHERE o.is_correct = 1
     ) correct ON correct.question_id = q.id
     WHERE q.assessment_id = ?
     ORDER BY q.order_index ASC`
    , [attemptId, assessmentId]
  );

  const questions = questionRows.map((row) => ({
    id: row.id,
    order: row.order_index,
    text: row.question_text,
    selectedOptionId: row.selected_option_id || null,
    selectedOptionText: row.selected_option_text || null,
    correctOptionId: row.correct_option_id || null,
    correctOptionText: row.correct_option_text || null,
    isCorrect: row.selected_is_correct != null ? Boolean(row.selected_is_correct) : null
  }));

  const [historyRows] = await pool.execute(
    `SELECT attempt_number,
            status,
            score_percent,
            correct_answers,
            total_questions,
            time_spent_seconds,
            started_at,
            completed_at
       FROM assessment_attempts
      WHERE assessment_id = ? AND user_id = ?
      ORDER BY attempt_number ASC`
    , [assessmentId, userId]
  );

  const history = historyRows.map((row) => ({
    attemptNumber: Number(row.attempt_number),
    status: row.status,
    scorePercent: row.score_percent != null ? Number(row.score_percent) : null,
    correctAnswers: row.correct_answers != null ? Number(row.correct_answers) : null,
    totalQuestions: row.total_questions != null ? Number(row.total_questions) : null,
    timeSpentSeconds: row.time_spent_seconds != null ? Number(row.time_spent_seconds) : null,
    startedAt: toIsoUtc(row.started_at),
    completedAt: toIsoUtc(row.completed_at)
  }));

  return {
    assessment: {
      id: attempt.assessment_id,
      title: attempt.title,
      passScorePercent: attempt.pass_score_percent != null ? Number(attempt.pass_score_percent) : null,
      maxAttempts: attempt.max_attempts != null ? Number(attempt.max_attempts) : null
    },
    attempt: {
      id: attempt.id,
      attemptNumber: Number(attempt.attempt_number),
      status: attempt.status,
      scorePercent: attempt.score_percent != null ? Number(attempt.score_percent) : null,
      correctAnswers: attempt.correct_answers != null ? Number(attempt.correct_answers) : null,
      totalQuestions: attempt.total_questions != null ? Number(attempt.total_questions) : null,
      timeSpentSeconds: attempt.time_spent_seconds != null ? Number(attempt.time_spent_seconds) : null,
      startedAt: toIsoUtc(attempt.started_at),
      completedAt: toIsoUtc(attempt.completed_at),
      passed:
        attempt.score_percent != null && attempt.pass_score_percent != null
          ? Number(attempt.score_percent) >= Number(attempt.pass_score_percent)
          : null
    },
    questions,
    history
  };
}

module.exports = {
  createAssessment,
  updateAssessment,
  deleteAssessment,
  listAssessmentsForManager,
  findAssessmentByIdForManager,
  hasAttempts,
  listAssignableUsers,
  listAssignablePositions,
  listAssignableBranches,
  listAssignedUserIds,
  listAssessmentsForUser,
  getAssessmentForUser,
  createAttempt,
  saveAnswer,
  completeAttempt,
  getAttemptResult
};
