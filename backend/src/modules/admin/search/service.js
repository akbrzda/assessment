const { pool } = require("../../../config/database");

function normalizeLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 8;
  }
  return Math.min(Math.trunc(parsed), 30);
}

async function globalSearch(req, res, next) {
  try {
    const query = String(req.query.q || "").trim();
    const limit = normalizeLimit(req.query.limit);

    if (query.length < 2) {
      return res.json({
        query,
        users: [],
        assessments: [],
        questions: [],
      });
    }

    const like = `%${query}%`;
    const isManager = req.user?.role === "manager";
    const managerBranchId = Number(req.user?.branch_id || req.user?.branchId || 0);

    const userSql = `
      SELECT u.id, u.first_name, u.last_name, u.login, b.name AS branch_name
      FROM users u
      LEFT JOIN branches b ON b.id = u.branch_id
      WHERE (u.first_name LIKE ? OR u.last_name LIKE ? OR u.login LIKE ?)
      ${isManager ? "AND u.branch_id = ?" : ""}
      ORDER BY u.id DESC
      LIMIT ?
    `;
    const userParams = isManager ? [like, like, like, managerBranchId, limit] : [like, like, like, limit];

    const assessmentSql = `
      SELECT a.id, a.title, a.open_at, a.close_at
      FROM assessments a
      WHERE a.title LIKE ?
      ORDER BY a.id DESC
      LIMIT ?
    `;

    const questionSql = `
      SELECT qb.id, qb.question_text, qb.question_type, qc.name AS category_name
      FROM question_bank qb
      LEFT JOIN question_categories qc ON qc.id = qb.category_id
      WHERE qb.question_text LIKE ?
      ORDER BY qb.id DESC
      LIMIT ?
    `;

    const [users, assessments, questions] = await Promise.all([
      pool.query(userSql, userParams).then(([rows]) => rows),
      pool.query(assessmentSql, [like, limit]).then(([rows]) => rows),
      pool.query(questionSql, [like, limit]).then(([rows]) => rows),
    ]);

    res.json({
      query,
      users,
      assessments,
      questions,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  globalSearch,
};
