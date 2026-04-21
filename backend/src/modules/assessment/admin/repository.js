const { pool } = require("../../../config/database");

async function listAssessments({ status, branch, search, userRole, userId, page = 1, limit = 20 }) {
  const params = [];
  const conditions = [];

  const statusExpression = `
    CASE
      WHEN UTC_TIMESTAMP() < a.open_at THEN 'pending'
      WHEN UTC_TIMESTAMP() BETWEEN a.open_at AND a.close_at THEN 'open'
      ELSE 'closed'
    END
  `;

  if (status) {
    conditions.push(`${statusExpression} = ?`);
    params.push(status);
  }

  if (search) {
    conditions.push("(a.title LIKE ? OR a.description LIKE ?)");
    const pattern = `%${search}%`;
    params.push(pattern, pattern);
  }

  if (userRole === "manager") {
    conditions.push(`(
      a.created_by = ?
      OR EXISTS (
        SELECT 1
        FROM assessment_user_assignments aua_m
        JOIN users u_m ON u_m.id = aua_m.user_id
        WHERE aua_m.assessment_id = a.id
          AND u_m.branch_id = (SELECT branch_id FROM users WHERE id = ?)
      )
    )`);
    params.push(userId, userId);
  }

  if (branch) {
    const branchId = Number(branch);
    if (!Number.isNaN(branchId)) {
      conditions.push(`EXISTS (
        SELECT 1
        FROM assessment_user_assignments aua_b
        JOIN users u_b ON u_b.id = aua_b.user_id
        WHERE aua_b.assessment_id = a.id
          AND u_b.branch_id = ?
      )`);
      params.push(branchId);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (Math.max(page, 1) - 1) * Math.max(limit, 1);

  const dataQuery = `
    SELECT
      a.id,
      a.title,
      a.description,
      a.open_at,
      a.close_at,
      a.time_limit_minutes,
      a.pass_score_percent,
      a.max_attempts,
      ${statusExpression} AS status,
      a.created_at,
      (
        SELECT COUNT(DISTINCT aua.user_id)
        FROM assessment_user_assignments aua
        WHERE aua.assessment_id = a.id
      ) AS assigned_users,
      (
        SELECT COUNT(*)
        FROM assessment_attempts aa
        WHERE aa.assessment_id = a.id
      ) AS total_attempts,
      (
        SELECT COUNT(*)
        FROM assessment_attempts aa
        WHERE aa.assessment_id = a.id
          AND aa.status = 'completed'
          AND aa.score_percent >= a.pass_score_percent
      ) AS completed_attempts,
      (
        SELECT AVG(aa.score_percent)
        FROM assessment_attempts aa
        WHERE aa.assessment_id = a.id AND aa.status = 'completed'
      ) AS avg_score
    FROM assessments a
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM assessments a
     ${whereClause}`,
    params,
  );

  const [rows] = await pool.query(dataQuery, [...params, limit, offset]);
  return {
    items: rows,
    total: Number(countRows?.[0]?.total || 0),
    page,
    limit,
  };
}

async function findAssessmentById(assessmentId) {
  const [rows] = await pool.query("SELECT * FROM assessments WHERE id = ?", [assessmentId]);
  return rows[0] || null;
}

async function listAssessmentQuestions(assessmentId) {
  const [rows] = await pool.query(
    `
    SELECT
      q.id,
      q.question_text,
      q.question_bank_id,
      q.order_index,
      q.question_type,
      q.correct_text_answer
    FROM assessment_questions q
    WHERE q.assessment_id = ?
    ORDER BY q.order_index
  `,
    [assessmentId],
  );
  return rows;
}

async function listQuestionOptions(questionId) {
  const [rows] = await pool.query(
    `
    SELECT id, option_text, match_text, is_correct, order_index
    FROM assessment_question_options
    WHERE question_id = ?
    ORDER BY order_index
  `,
    [questionId],
  );
  return rows;
}

async function listAssignedUsers(assessmentId) {
  const [rows] = await pool.query(
    `
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.telegram_id,
      b.name AS branch_name,
      p.name AS position_name
    FROM users u
    JOIN (
      SELECT aua.user_id AS user_id
      FROM assessment_user_assignments aua
      WHERE aua.assessment_id = ?
      UNION
      SELECT u.id AS user_id
      FROM assessment_branch_assignments aba
      JOIN users u ON u.branch_id = aba.branch_id
      WHERE aba.assessment_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM assessment_position_assignments apa WHERE apa.assessment_id = aba.assessment_id
        )
      UNION
      SELECT u.id AS user_id
      FROM assessment_position_assignments apa
      JOIN users u ON u.position_id = apa.position_id
      WHERE apa.assessment_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM assessment_branch_assignments aba WHERE aba.assessment_id = apa.assessment_id
        )
      UNION
      SELECT u.id AS user_id
      FROM assessment_branch_assignments aba
      JOIN assessment_position_assignments apa ON apa.assessment_id = aba.assessment_id
      JOIN users u ON u.branch_id = aba.branch_id AND u.position_id = apa.position_id
      WHERE aba.assessment_id = ?
    ) assigned ON assigned.user_id = u.id
    LEFT JOIN branches b ON u.branch_id = b.id
    LEFT JOIN positions p ON u.position_id = p.id
  `,
    [assessmentId, assessmentId, assessmentId, assessmentId],
  );

  return rows;
}

async function listAssessmentAttempts(assessmentId) {
  const [rows] = await pool.query(
    `
    SELECT
      aa.id,
      aa.user_id,
      aa.status,
      aa.score_percent,
      aa.total_questions,
      aa.correct_answers,
      aa.started_at,
      aa.completed_at,
      u.first_name,
      u.last_name
    FROM assessment_attempts aa
    JOIN users u ON aa.user_id = u.id
    WHERE aa.assessment_id = ?
    ORDER BY aa.started_at DESC
  `,
    [assessmentId],
  );
  return rows;
}

module.exports = {
  listAssessments,
  findAssessmentById,
  listAssessmentQuestions,
  listQuestionOptions,
  listAssignedUsers,
  listAssessmentAttempts,
};
