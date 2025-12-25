const { pool } = require("../config/database");

/**
 * Middleware для проверки доступа пользователя к модулю
 * @param {string} moduleCode - код модуля для проверки
 */
const checkModuleAccess = (moduleCode) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      // Суперадмин имеет доступ ко всему
      if (userRole === "superadmin") {
        return next();
      }

      // Получаем модуль
      const [modules] = await pool.query(
        "SELECT id FROM system_modules WHERE code = ? AND is_active = 1",
        [moduleCode]
      );

      if (modules.length === 0) {
        return res.status(404).json({ error: "Модуль не найден" });
      }

      const moduleId = modules[0].id;

      // Проверяем кастомные права пользователя
      const [permissions] = await pool.query(
        "SELECT has_access FROM user_permissions WHERE user_id = ? AND module_id = ?",
        [userId, moduleId]
      );

      // Если есть кастомная настройка, используем её
      if (permissions.length > 0) {
        if (permissions[0].has_access) {
          return next();
        }
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      // Проверяем права по умолчанию для роли
      const defaultManagerModules = ["assessments", "analytics", "users", "questions"];
      const hasDefaultAccess = userRole === "manager" && defaultManagerModules.includes(moduleCode);

      if (hasDefaultAccess) {
        return next();
      }

      return res.status(403).json({ error: "Доступ запрещен" });
    } catch (error) {
      next(error);
    }
  };
};

module.exports = checkModuleAccess;
