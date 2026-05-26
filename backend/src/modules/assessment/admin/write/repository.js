const { pool } = require("../../../../config/database");

// ─── Transaction-aware helpers (accept connection) ───────────────────────────

async function findUserWithRole(conn, userId) {
  const [rows] = await conn.query(
    `SELECT u.id, u.branch_id, r.name AS role_name
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [userId],
  );
  return rows[0] || null;
}

async function validatePositionsInBranch(conn, positionIds, branchId) {
  const [rows] = await conn.query(
    `SELECT DISTINCT p.id
     FROM positions p
     JOIN users u ON u.position_id = p.id
     WHERE p.id IN (?) AND u.branch_id = ?`,
    [positionIds, branchId],
  );
  return rows.map((r) => r.id);
}

async function validateUsersInBranch(conn, userIds, branchId) {
  const [rows] = await conn.query(
    `SELECT id FROM users WHERE id IN (?) AND branch_id = ?`,
    [userIds, branchId],
  );
  return rows.map((r) => r.id);
}

async function insertAssessment(conn, data) {
  const [result] = await conn.query(
    `INSERT INTO assessments
       (title, description, open_at, close_at, time_limit_minutes,
        pass_score_percent, max_attempts, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description,
      data.openAt,
      data.closeAt,
      data.timeLimitMinutes,
      data.passScorePercent,
      data.maxAttempts,
      data.createdBy,
    ],
  );
  return result.insertId;
}

async function insertQuestion(conn, assessmentId, question, orderIndex) {
  const [result] = await conn.query(
    `INSERT INTO assessment_questions
       (assessment_id, question_bank_id, question_text, order_index, question_type, correct_text_answer)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      assessmentId,
      question.questionBankId || null,
      question.text,
      orderIndex,
      question.questionType,
      question.correctTextAnswer || null,
    ],
  );
  return result.insertId;
}

async function insertQuestionOption(
  conn,
  questionId,
  option,
  orderIndex,
  questionType,
) {
  const isCorrectValue =
    questionType === "single" || questionType === "multiple"
      ? option.isCorrect
        ? 1
        : 0
      : 0;
  await conn.query(
    `INSERT INTO assessment_question_options
       (question_id, option_text, match_text, is_correct, order_index)
     VALUES (?, ?, ?, ?, ?)`,
    [
      questionId,
      option.text,
      questionType === "matching" ? option.matchText || "" : null,
      isCorrectValue,
      orderIndex,
    ],
  );
}

async function insertBranchAssignments(conn, assessmentId, branchIds) {
  if (!branchIds || branchIds.length === 0) return;
  const values = branchIds.map((bid) => [assessmentId, bid]);
  await conn.query(
    "INSERT INTO assessment_branch_assignments (assessment_id, branch_id) VALUES ?",
    [values],
  );
}

async function insertPositionAssignments(conn, assessmentId, positionIds) {
  if (!positionIds || positionIds.length === 0) return;
  const values = positionIds.map((pid) => [assessmentId, pid]);
  await conn.query(
    "INSERT INTO assessment_position_assignments (assessment_id, position_id) VALUES ?",
    [values],
  );
}

async function getUsersByBranchAndPosition(conn, branchIds, positionIds) {
  const [rows] = await conn.query(
    `SELECT DISTINCT u.id FROM users u
     WHERE u.branch_id IN (?) AND u.position_id IN (?)`,
    [branchIds, positionIds],
  );
  return rows.map((r) => r.id);
}

async function getUsersByBranches(conn, branchIds) {
  const [rows] = await conn.query(
    `SELECT DISTINCT u.id FROM users u WHERE u.branch_id IN (?)`,
    [branchIds],
  );
  return rows.map((r) => r.id);
}

async function getUsersByPositions(conn, positionIds) {
  const [rows] = await conn.query(
    `SELECT DISTINCT u.id FROM users u WHERE u.position_id IN (?)`,
    [positionIds],
  );
  return rows.map((r) => r.id);
}

async function insertUserAssignments(
  conn,
  assessmentId,
  autoUserIds,
  directUserIds,
) {
  const autoValues = autoUserIds.map((uid) => [assessmentId, uid, 0]);
  const directValues = directUserIds.map((uid) => [assessmentId, uid, 1]);
  const all = [...autoValues, ...directValues];
  if (all.length === 0) return;
  await conn.query(
    `INSERT INTO assessment_user_assignments (assessment_id, user_id, is_direct)
     VALUES ?
     ON DUPLICATE KEY UPDATE is_direct = GREATEST(is_direct, VALUES(is_direct))`,
    [all],
  );
}

async function findAssessmentWithStatus(conn, assessmentId) {
  const [rows] = await conn.query(
    `SELECT *,
       CASE
         WHEN UTC_TIMESTAMP() < open_at THEN 'pending'
         WHEN UTC_TIMESTAMP() BETWEEN open_at AND close_at THEN 'open'
         ELSE 'closed'
       END AS status
     FROM assessments WHERE id = ?`,
    [assessmentId],
  );
  return rows[0] || null;
}

async function countInProgressAttempts(conn, assessmentId) {
  const [[row]] = await conn.query(
    "SELECT COUNT(*) AS total FROM assessment_attempts WHERE assessment_id = ? AND status = 'in_progress'",
    [assessmentId],
  );
  return Number(row?.total || 0);
}

async function updateAssessmentFields(conn, assessmentId, fields, values) {
  await conn.query(`UPDATE assessments SET ${fields.join(", ")} WHERE id = ?`, [
    ...values,
    assessmentId,
  ]);
}

async function deleteBranchAssignments(conn, assessmentId) {
  await conn.query(
    "DELETE FROM assessment_branch_assignments WHERE assessment_id = ?",
    [assessmentId],
  );
}

async function deletePositionAssignments(conn, assessmentId) {
  await conn.query(
    "DELETE FROM assessment_position_assignments WHERE assessment_id = ?",
    [assessmentId],
  );
}

async function deleteUserAssignments(conn, assessmentId) {
  await conn.query(
    "DELETE FROM assessment_user_assignments WHERE assessment_id = ?",
    [assessmentId],
  );
}

async function countAssessmentQuestions(conn, assessmentId) {
  const [[row]] = await conn.query(
    "SELECT COUNT(*) AS total FROM assessment_questions WHERE assessment_id = ?",
    [assessmentId],
  );
  return Number(row?.total || 0);
}

async function deleteAssessmentQuestions(conn, assessmentId) {
  await conn.query("DELETE FROM assessment_questions WHERE assessment_id = ?", [
    assessmentId,
  ]);
}

// ─── Pool-based read helpers ─────────────────────────────────────────────────

async function findAssessmentForDelete(assessmentId) {
  const [rows] = await pool.query(
    `SELECT title, created_by,
       CASE
         WHEN UTC_TIMESTAMP() < open_at THEN 'pending'
         WHEN UTC_TIMESTAMP() BETWEEN open_at AND close_at THEN 'open'
         ELSE 'closed'
       END AS status
     FROM assessments WHERE id = ?`,
    [assessmentId],
  );
  return rows[0] || null;
}

async function deleteAssessmentById(assessmentId) {
  await pool.query("DELETE FROM assessments WHERE id = ?", [assessmentId]);
}

async function findAssessmentResults(assessmentId) {
  const [rows] = await pool.query(
    `SELECT aa.id, aa.user_id, aa.status, aa.score_percent, aa.total_questions,
            aa.correct_answers, aa.started_at, aa.completed_at,
            TIMESTAMPDIFF(SECOND, aa.started_at, aa.completed_at) AS duration_seconds,
            u.first_name, u.last_name, u.telegram_id,
            b.name AS branch_name, p.name AS position_name
     FROM assessment_attempts aa
     JOIN users u ON aa.user_id = u.id
     LEFT JOIN branches b ON u.branch_id = b.id
     LEFT JOIN positions p ON u.position_id = p.id
     WHERE aa.assessment_id = ?
     ORDER BY aa.started_at DESC`,
    [assessmentId],
  );
  return rows;
}

async function findAssessmentWithStatusPool(assessmentId) {
  const [rows] = await pool.query(
    `SELECT *,
       CASE
         WHEN UTC_TIMESTAMP() < open_at THEN 'pending'
         WHEN UTC_TIMESTAMP() BETWEEN open_at AND close_at THEN 'open'
         ELSE 'closed'
       END AS status
     FROM assessments WHERE id = ?`,
    [assessmentId],
  );
  return rows[0] || null;
}

async function checkManagerAccess(assessmentId, userId) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM assessments a
     WHERE a.id = ?
       AND (
         a.created_by = ?
         OR EXISTS (
           SELECT 1
           FROM assessment_user_assignments aua
           JOIN users u ON u.id = aua.user_id
           WHERE aua.assessment_id = a.id
             AND u.branch_id = (SELECT branch_id FROM users WHERE id = ?)
         )
       )`,
    [assessmentId, userId, userId],
  );
  return rows.length > 0;
}

async function findQuestions(assessmentId) {
  const [rows] = await pool.query(
    `SELECT q.id, q.question_text, q.question_bank_id,
            q.order_index, q.question_type, q.correct_text_answer
     FROM assessment_questions q
     WHERE q.assessment_id = ?
     ORDER BY q.order_index`,
    [assessmentId],
  );
  return rows;
}

async function findQuestionOptions(questionId) {
  const [rows] = await pool.query(
    `SELECT id, option_text, match_text, is_correct, order_index
     FROM assessment_question_options
     WHERE question_id = ?
     ORDER BY order_index`,
    [questionId],
  );
  return rows;
}

async function findQuestionAnswerStats(questionId) {
  const [rows] = await pool.query(
    `SELECT ans.option_id, COUNT(*) AS selection_count
     FROM assessment_answers ans
     JOIN assessment_attempts aa ON ans.attempt_id = aa.id
     WHERE ans.question_id = ? AND aa.status = 'completed'
     GROUP BY ans.option_id`,
    [questionId],
  );
  return rows;
}

async function findParticipants(assessmentId) {
  const [rows] = await pool.query(
    `SELECT
       u.id, u.first_name, u.last_name, u.telegram_id,
       b.name AS branch_name, p.name AS position_name,
       in_progress.id AS in_progress_attempt_id,
       best_completed.id AS best_completed_attempt_id,
       COALESCE(in_progress.id, best_completed.id) AS attempt_id,
       COALESCE(in_progress.status, best_completed.status) AS attempt_status,
       COALESCE(in_progress.score_percent, best_completed.score_percent) AS score_percent,
       COALESCE(in_progress.correct_answers, best_completed.correct_answers) AS correct_answers,
       COALESCE(in_progress.total_questions, best_completed.total_questions) AS total_questions,
       COALESCE(in_progress.started_at, best_completed.started_at) AS started_at,
       COALESCE(in_progress.completed_at, best_completed.completed_at) AS completed_at,
       TIMESTAMPDIFF(SECOND,
         COALESCE(in_progress.started_at, best_completed.started_at),
         COALESCE(in_progress.completed_at, best_completed.completed_at)) AS time_spent_seconds,
       tc.time_spent_seconds AS theory_time_seconds,
       tc.completed_at AS theory_completed_at
     FROM assessment_user_assignments aua
     JOIN users u ON aua.user_id = u.id
     LEFT JOIN branches b ON u.branch_id = b.id
     LEFT JOIN positions p ON u.position_id = p.id
     LEFT JOIN (
       SELECT aa.*
       FROM (
         SELECT aa2.*,
                ROW_NUMBER() OVER (PARTITION BY aa2.user_id ORDER BY aa2.started_at DESC) AS rn
         FROM assessment_attempts aa2
         WHERE aa2.assessment_id = ? AND aa2.status = 'in_progress'
       ) aa WHERE aa.rn = 1
     ) in_progress ON in_progress.user_id = u.id
     LEFT JOIN (
       SELECT aa.*
       FROM (
         SELECT aa1.*,
                ROW_NUMBER() OVER (PARTITION BY aa1.user_id ORDER BY aa1.score_percent DESC, aa1.completed_at DESC) AS rn
         FROM assessment_attempts aa1
         WHERE aa1.assessment_id = ? AND aa1.status = 'completed'
       ) aa WHERE aa.rn = 1
     ) best_completed ON best_completed.user_id = u.id AND in_progress.id IS NULL
     LEFT JOIN assessment_theory_completions tc
       ON tc.assessment_id = aua.assessment_id
       AND tc.user_id = u.id
       AND tc.version_id = (SELECT current_theory_version_id FROM assessments WHERE id = aua.assessment_id)
     WHERE aua.assessment_id = ?
     ORDER BY u.last_name, u.first_name`,
    [assessmentId, assessmentId, assessmentId],
  );
  return rows;
}

async function findAnswersByAttempts(attemptIds) {
  const [rows] = await pool.query(
    `SELECT attempt_id, question_id, option_id, selected_option_ids, text_answer, is_correct
     FROM assessment_answers WHERE attempt_id IN (?)`,
    [attemptIds],
  );
  return rows;
}

async function findAssessmentStats(assessmentId, passScore) {
  const [[stats]] = await pool.query(
    `SELECT
       COUNT(DISTINCT aua.user_id) AS total_assigned,
       COUNT(DISTINCT CASE WHEN latest.status = 'completed' THEN latest.user_id END) AS completed_count,
       COUNT(DISTINCT CASE WHEN latest.status = 'in_progress' THEN latest.user_id END) AS in_progress_count,
       COUNT(DISTINCT CASE WHEN latest.id IS NULL THEN aua.user_id END) AS not_started_count,
       AVG(CASE WHEN latest.status = 'completed' THEN latest.score_percent END) AS avg_score,
       MIN(CASE WHEN latest.status = 'completed' THEN latest.score_percent END) AS min_score,
       MAX(CASE WHEN latest.status = 'completed' THEN latest.score_percent END) AS max_score,
       COUNT(DISTINCT CASE WHEN latest.score_percent >= ? THEN latest.user_id END) AS passed_count,
       COALESCE(AVG(tc.time_spent_seconds), 0) AS avg_theory_time_seconds,
       COALESCE(COUNT(DISTINCT tc.user_id), 0) AS theory_completed_count
     FROM assessment_user_assignments aua
     LEFT JOIN (
       SELECT aa1.*
       FROM assessment_attempts aa1
       INNER JOIN (
         SELECT user_id, MAX(score_percent) AS max_score, MAX(completed_at) AS max_completed
         FROM assessment_attempts
         WHERE assessment_id = ? AND status = 'completed'
         GROUP BY user_id
       ) aa2 ON aa1.user_id = aa2.user_id
               AND aa1.score_percent = aa2.max_score
               AND aa1.completed_at = aa2.max_completed
       WHERE aa1.assessment_id = ? AND aa1.status = 'completed'
     ) latest ON latest.user_id = aua.user_id
     LEFT JOIN assessment_theory_completions tc
       ON tc.assessment_id = aua.assessment_id
       AND tc.user_id = aua.user_id
       AND tc.version_id = (SELECT current_theory_version_id FROM assessments WHERE id = aua.assessment_id)
     WHERE aua.assessment_id = ?`,
    [passScore, assessmentId, assessmentId, assessmentId],
  );
  return stats;
}

async function findAssignedBranches(assessmentId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT b.id, b.name
     FROM assessment_branch_assignments aba
     JOIN branches b ON aba.branch_id = b.id
     WHERE aba.assessment_id = ?
     ORDER BY b.name`,
    [assessmentId],
  );
  return rows;
}

async function findAssignedPositions(assessmentId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT p.id, p.name
     FROM assessment_position_assignments apa
     JOIN positions p ON apa.position_id = p.id
     WHERE apa.assessment_id = ?
     ORDER BY p.name`,
    [assessmentId],
  );
  return rows;
}

async function findDirectlyAssignedUsers(assessmentId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT u.id, u.first_name, u.last_name
     FROM assessment_user_assignments aua
     JOIN users u ON aua.user_id = u.id
     WHERE aua.assessment_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM assessment_branch_assignments aba
         WHERE aba.assessment_id = aua.assessment_id AND aba.branch_id = u.branch_id
       )
       AND NOT EXISTS (
         SELECT 1 FROM assessment_position_assignments apa
         WHERE apa.assessment_id = aua.assessment_id AND apa.position_id = u.position_id
       )
     ORDER BY u.last_name, u.first_name`,
    [assessmentId],
  );
  return rows;
}

async function findTargetUserBranch(userId) {
  const [rows] = await pool.query(
    "SELECT branch_id FROM users WHERE id = ? LIMIT 1",
    [userId],
  );
  return rows[0]?.branch_id || null;
}

async function findUserAssignedToAssessment(assessmentId, userId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.telegram_id,
            b.name AS branch_name, p.name AS position_name
     FROM users u
     JOIN (
       SELECT aua.user_id AS user_id
       FROM assessment_user_assignments aua WHERE aua.assessment_id = ?
       UNION
       SELECT u.id AS user_id
       FROM assessment_branch_assignments aba
       JOIN users u ON u.branch_id = aba.branch_id
       WHERE aba.assessment_id = ?
         AND NOT EXISTS (SELECT 1 FROM assessment_position_assignments apa WHERE apa.assessment_id = aba.assessment_id)
       UNION
       SELECT u.id AS user_id
       FROM assessment_position_assignments apa
       JOIN users u ON u.position_id = apa.position_id
       WHERE apa.assessment_id = ?
         AND NOT EXISTS (SELECT 1 FROM assessment_branch_assignments aba WHERE aba.assessment_id = apa.assessment_id)
       UNION
       SELECT u.id AS user_id
       FROM assessment_branch_assignments aba
       JOIN assessment_position_assignments apa ON apa.assessment_id = aba.assessment_id
       JOIN users u ON u.branch_id = aba.branch_id AND u.position_id = apa.position_id
       WHERE aba.assessment_id = ?
     ) assigned ON assigned.user_id = u.id
     LEFT JOIN branches b ON u.branch_id = b.id
     LEFT JOIN positions p ON u.position_id = p.id
     WHERE u.id = ?
     LIMIT 1`,
    [assessmentId, assessmentId, assessmentId, assessmentId, userId],
  );
  return rows[0] || null;
}

async function findAttempts(assessmentId, userId) {
  const [rows] = await pool.query(
    `SELECT id, attempt_number, status, score_percent, correct_answers,
            total_questions, time_spent_seconds, started_at, completed_at
     FROM assessment_attempts
     WHERE assessment_id = ? AND user_id = ?
     ORDER BY attempt_number DESC, started_at DESC`,
    [assessmentId, userId],
  );
  return rows;
}

async function findQuestionsWithOptions(assessmentId) {
  const [rows] = await pool.query(
    `SELECT q.id, q.question_text, q.order_index, q.question_type, q.correct_text_answer,
            o.id AS option_id, o.option_text, o.match_text, o.is_correct,
            o.order_index AS option_order
     FROM assessment_questions q
     LEFT JOIN assessment_question_options o ON o.question_id = q.id
     WHERE q.assessment_id = ?
     ORDER BY q.order_index, o.order_index`,
    [assessmentId],
  );
  return rows;
}

async function findAnswersByAttempt(attemptId) {
  const [rows] = await pool.query(
    `SELECT question_id, option_id, selected_option_ids, text_answer, is_correct
     FROM assessment_answers WHERE attempt_id = ?`,
    [attemptId],
  );
  return rows;
}

async function findTheoryCompletion(assessmentId, userId) {
  const [rows] = await pool.query(
    `SELECT tc.time_spent_seconds, tc.completed_at
     FROM assessment_theory_completions tc
     JOIN assessments a ON a.id = tc.assessment_id
     WHERE tc.assessment_id = ? AND tc.user_id = ? AND tc.version_id = a.current_theory_version_id
     LIMIT 1`,
    [assessmentId, userId],
  );
  return rows[0] || null;
}

async function findAssessmentForExport(assessmentId) {
  const [rows] = await pool.query(
    `SELECT id, title, description, open_at, close_at,
            time_limit_minutes, pass_score_percent, max_attempts
     FROM assessments WHERE id = ?`,
    [assessmentId],
  );
  return rows[0] || null;
}

async function findExportResults(assessmentId) {
  const [rows] = await pool.query(
    `SELECT u.first_name, u.last_name,
            b.name AS branch_name, p.name AS position_name,
            COALESCE(ip.status, bc.status) AS status,
            COALESCE(ip.score_percent, bc.score_percent) AS score_percent,
            COALESCE(ip.correct_answers, bc.correct_answers) AS correct_answers,
            COALESCE(ip.total_questions, bc.total_questions) AS total_questions,
            COALESCE(ip.started_at, bc.started_at) AS started_at,
            COALESCE(ip.completed_at, bc.completed_at) AS completed_at,
            TIMESTAMPDIFF(SECOND,
              COALESCE(ip.started_at, bc.started_at),
              COALESCE(ip.completed_at, bc.completed_at)) AS time_spent_seconds
     FROM assessment_user_assignments aua
     JOIN users u ON aua.user_id = u.id
     LEFT JOIN branches b ON u.branch_id = b.id
     LEFT JOIN positions p ON u.position_id = p.id
     LEFT JOIN (
       SELECT aa.*
       FROM (
         SELECT aa1.*,
                ROW_NUMBER() OVER (PARTITION BY aa1.user_id ORDER BY aa1.started_at DESC) AS rn
         FROM assessment_attempts aa1
         WHERE aa1.assessment_id = ? AND aa1.status = 'in_progress'
       ) aa WHERE aa.rn = 1
     ) ip ON ip.user_id = u.id
     LEFT JOIN (
       SELECT aa.*
       FROM (
         SELECT aa2.*,
                ROW_NUMBER() OVER (PARTITION BY aa2.user_id ORDER BY aa2.score_percent DESC, aa2.completed_at DESC) AS rn
         FROM assessment_attempts aa2
         WHERE aa2.assessment_id = ? AND aa2.status = 'completed'
       ) aa WHERE aa.rn = 1
     ) bc ON bc.user_id = u.id AND ip.id IS NULL
     WHERE aua.assessment_id = ?
     ORDER BY u.last_name, u.first_name`,
    [assessmentId, assessmentId, assessmentId],
  );
  return rows;
}

// ─── Audit log (stub — реальная реализация в отдельном модуле) ───────────────
async function createAdminLog() {
  return Promise.resolve();
}

module.exports = {
  // transaction-aware
  findUserWithRole,
  validatePositionsInBranch,
  validateUsersInBranch,
  insertAssessment,
  insertQuestion,
  insertQuestionOption,
  insertBranchAssignments,
  insertPositionAssignments,
  getUsersByBranchAndPosition,
  getUsersByBranches,
  getUsersByPositions,
  insertUserAssignments,
  findAssessmentWithStatus,
  countInProgressAttempts,
  updateAssessmentFields,
  deleteBranchAssignments,
  deletePositionAssignments,
  deleteUserAssignments,
  countAssessmentQuestions,
  deleteAssessmentQuestions,
  // pool-based reads
  findAssessmentForDelete,
  deleteAssessmentById,
  findAssessmentResults,
  findAssessmentWithStatusPool,
  checkManagerAccess,
  findQuestions,
  findQuestionOptions,
  findQuestionAnswerStats,
  findParticipants,
  findAnswersByAttempts,
  findAssessmentStats,
  findAssignedBranches,
  findAssignedPositions,
  findDirectlyAssignedUsers,
  findTargetUserBranch,
  findUserAssignedToAssessment,
  findAttempts,
  findQuestionsWithOptions,
  findAnswersByAttempt,
  findTheoryCompletion,
  findAssessmentForExport,
  findExportResults,
  createAdminLog,
};
