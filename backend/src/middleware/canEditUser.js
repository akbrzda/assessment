const { pool } = require("../config/database");

/**
 * Middleware для проверки может ли текущий пользователь редактировать указанного пользователя
 * Manager может редактировать только employee своего филиала
 */
const canEditUser = async (req, res, next) => {
  try {
    const currentUser = req.user;
    const targetUserId = Number(req.params.id || req.params.userId);

    // Суперадмин может редактировать всех
    if (currentUser.role === "superadmin") {
      return next();
    }

    // Manager может редактировать всех employee и себя
    if (currentUser.role === "manager") {
      // Manager может редактировать себя
      if (targetUserId === currentUser.id) {
        return next();
      }

      const [targetUser] = await pool.query(
        `SELECT u.id, u.branch_id, r.name as role_name 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE u.id = ?`,
        [targetUserId]
      );

      if (targetUser.length === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const target = targetUser[0];

      // Проверяем что это employee
      if (target.role_name !== "employee") {
        return res.status(403).json({
          error: "Вы можете редактировать только сотрудников с ролью employee",
        });
      }

      const managerBranchId = Number(currentUser.branch_id || currentUser.branchId || 0);
      let resolvedManagerBranchId = managerBranchId;

      if (!resolvedManagerBranchId) {
        const [managerRows] = await pool.query("SELECT branch_id FROM users WHERE id = ? LIMIT 1", [currentUser.id]);
        resolvedManagerBranchId = Number(managerRows?.[0]?.branch_id || 0);
      }

      if (!resolvedManagerBranchId || Number(target.branch_id) !== resolvedManagerBranchId) {
        return res.status(403).json({
          error: "Вы можете редактировать только сотрудников своего филиала",
        });
      }

      return next();
    }

    return res.status(403).json({ error: "Доступ запрещен" });
  } catch (error) {
    next(error);
  }
};

module.exports = canEditUser;
