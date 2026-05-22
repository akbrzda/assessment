const { hasDefaultModuleAccess } = require("../config/roleModules");
const { logAccessDenied } = require("../services/auditService");

/**
 * Middleware для проверки доступа пользователя к модулю
 * @param {string} moduleCode - код модуля для проверки
 */
const checkModuleAccess = (moduleCode) => {
  return async (req, res, next) => {
    try {
      const userId = Number(req.user?.id);
      const userRole = String(req.user?.role || "").toLowerCase();

      if (!userId) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      // Используем только захардкоженный доступ по ролям без персональных overrides.
      if (hasDefaultModuleAccess(userRole, moduleCode)) {
        return next();
      }

      logAccessDenied({ req, reason: "module_access_denied", metadata: { moduleCode } }).catch(() => {});
      return res.status(403).json({ error: "Доступ запрещен" });
    } catch (error) {
      next(error);
    }
  };
};

module.exports = checkModuleAccess;
