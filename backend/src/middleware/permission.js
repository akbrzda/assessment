const { logAccessDenied } = require("../services/auditService");

function requirePermission(moduleCode, entityCode, actionCode) {
  return async (req, res, next) => {
    try {
      const userId = Number(req.user?.id);
      const roleName = String(req.user?.role || "").toLowerCase();
      const isAdminRole = roleName === "superadmin" || roleName === "manager";

      if (!userId) {
        return res.status(401).json({ error: "Не авторизован" });
      }

      // Отключаем новую granular RBAC-логику и возвращаем старое поведение:
      // допуск только по захардкоженным ролям админ-панели.
      if (!isAdminRole) {
        logAccessDenied({
          req,
          reason: "permission_denied_hardcoded",
          metadata: { moduleCode, entityCode, actionCode, source: "role_hardcoded" },
        }).catch(() => {});
        return res.status(403).json({
          error: "Доступ запрещен",
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  requirePermission,
};
