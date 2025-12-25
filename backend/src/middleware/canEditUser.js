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
          error: "Вы можете редактировать только сотрудников с ролью employee" 
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
