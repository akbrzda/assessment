const { pool } = require("../../config/database");

// ─── Чтение назначений ───────────────────────────────────────────────────────

async function getTargets(courseId) {
  const [[posRows], [branchRows]] = await Promise.all([
    pool.execute(
      `SELECT cpt.position_id, p.name AS position_title
         FROM course_position_targets cpt
         JOIN positions p ON p.id = cpt.position_id
        WHERE cpt.course_id = ?
        ORDER BY p.name ASC`,
      [courseId],
    ),
    pool.execute(
      `SELECT cbt.branch_id, b.name AS branch_title
         FROM course_branch_targets cbt
         JOIN branches b ON b.id = cbt.branch_id
        WHERE cbt.course_id = ?
        ORDER BY b.name ASC`,
      [courseId],
    ),
  ]);

  return {
    positions: posRows.map((r) => ({ id: Number(r.position_id), title: r.position_title })),
    branches: branchRows.map((r) => ({ id: Number(r.branch_id), title: r.branch_title })),
  };
}

async function getAssignments(courseId) {
  const [rows] = await pool.execute(
    `SELECT cua.user_id, cua.assigned_by, cua.assigned_at,
            u.first_name AS user_first_name, u.last_name AS user_last_name, u.login AS user_login,
            ab.first_name AS ab_first_name, ab.last_name AS ab_last_name,
            p.name AS position_title, b.name AS branch_title
       FROM course_user_assignments cua
       JOIN users u ON u.id = cua.user_id
       LEFT JOIN users ab ON ab.id = cua.assigned_by
       LEFT JOIN positions p ON p.id = u.position_id
       LEFT JOIN branches b ON b.id = u.branch_id
      WHERE cua.course_id = ?
      ORDER BY cua.assigned_at DESC`,
    [courseId],
  );

  return rows.map((r) => ({
    userId: Number(r.user_id),
    name: [r.user_first_name, r.user_last_name].filter(Boolean).join(" ") || r.user_login || `User #${r.user_id}`,
    positionTitle: r.position_title || null,
    branchTitle: r.branch_title || null,
    assignedBy: [r.ab_first_name, r.ab_last_name].filter(Boolean).join(" ") || null,
    assignedAt: r.assigned_at ? new Date(r.assigned_at).toISOString() : null,
  }));
}

// ─── Обновление назначений ────────────────────────────────────────────────────

async function replaceTargets(courseId, { positionIds, branchIds }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute("DELETE FROM course_position_targets WHERE course_id = ?", [courseId]);
    await connection.execute("DELETE FROM course_branch_targets WHERE course_id = ?", [courseId]);

    if (positionIds.length > 0) {
      const posValues = positionIds.map((pid) => [courseId, pid]);
      await connection.query("INSERT INTO course_position_targets (course_id, position_id) VALUES ?", [posValues]);
    }

    if (branchIds.length > 0) {
      const branchValues = branchIds.map((bid) => [courseId, bid]);
      await connection.query("INSERT INTO course_branch_targets (course_id, branch_id) VALUES ?", [branchValues]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function addAssignment(courseId, userId, assignedBy) {
  try {
    await pool.execute(
      `INSERT INTO course_user_assignments (course_id, user_id, assigned_by, assigned_at)
       VALUES (?, ?, ?, UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE assigned_by = VALUES(assigned_by), assigned_at = UTC_TIMESTAMP()`,
      [courseId, userId, assignedBy],
    );
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      const err = new Error("Пользователь или курс не найден");
      err.status = 404;
      throw err;
    }
    throw error;
  }
}

async function removeAssignment(courseId, userId) {
  const [result] = await pool.execute("DELETE FROM course_user_assignments WHERE course_id = ? AND user_id = ?", [courseId, userId]);
  return result.affectedRows > 0;
}

// ─── Фильтрация курсов для пользователя ─────────────────────────────────────

/**
 * Возвращает ID опубликованных курсов, доступных пользователю.
 * Курс доступен если:
 *   1) у него нет ни одного назначения (открытый курс)  ИЛИ
 *   2) должность пользователя есть в course_position_targets  ИЛИ
 *   3) филиал пользователя есть в course_branch_targets  ИЛИ
 *   4) пользователь назначен вручную в course_user_assignments
 */
async function listAssignedCourseIds(userId, userPositionId, userBranchId) {
  const params = [userId];
  const positionCond = userPositionId
    ? "OR EXISTS (SELECT 1 FROM course_position_targets cpt WHERE cpt.course_id = c.id AND cpt.position_id = ?)"
    : "";
  if (userPositionId) params.push(userPositionId);
  const branchCond = userBranchId ? "OR EXISTS (SELECT 1 FROM course_branch_targets cbt WHERE cbt.course_id = c.id AND cbt.branch_id = ?)" : "";
  if (userBranchId) params.push(userBranchId);

  const [rows] = await pool.execute(
    `SELECT c.id
       FROM courses c
      WHERE c.status = 'published'
        AND (
          -- Нет ни одного ограничения — открытый курс
          NOT EXISTS (SELECT 1 FROM course_position_targets WHERE course_id = c.id)
          AND NOT EXISTS (SELECT 1 FROM course_branch_targets WHERE course_id = c.id)
          AND NOT EXISTS (SELECT 1 FROM course_user_assignments WHERE course_id = c.id)
          -- Или пользователь назначен вручную
          OR EXISTS (SELECT 1 FROM course_user_assignments cua WHERE cua.course_id = c.id AND cua.user_id = ?)
          ${positionCond}
          ${branchCond}
        )`,
    params,
  );

  return new Set(rows.map((r) => Number(r.id)));
}

module.exports = {
  getTargets,
  getAssignments,
  replaceTargets,
  addAssignment,
  removeAssignment,
  listAssignedCourseIds,
};
