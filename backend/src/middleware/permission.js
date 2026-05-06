const permissionService = require("../services/PermissionService");
const { logAccessDenied } = require("../services/auditService");
const config = require("../config/env");

const LEGACY_ALLOWED_ROLES = new Set(["superadmin", "manager"]);

function requirePermission(moduleCode, entityCode, actionCode, options = {}) {
  return async (req, res, next) => {
    try {
      const roleName = String(req.user?.role || req.user?.roleName || "").toLowerCase();

      // Временный режим: возвращаем старую модель доступа по ролям без granular CRUD проверок.
      if (config.legacyCrudAuthEnabled && LEGACY_ALLOWED_ROLES.has(roleName)) {
        return next();
      }

      const context = options.contextBuilder ? options.contextBuilder(req) : {};
      const decision = await permissionService.can(req.user, moduleCode, entityCode, actionCode, context);

      if (!decision.allowed) {
        const status = req.user?.id ? 403 : 401;
        logAccessDenied({
          req,
          reason: decision.reason || "permission_denied",
          metadata: { moduleCode, entityCode, actionCode, source: decision.source },
        }).catch(() => {});
        return res.status(status).json({
          error: "Доступ запрещен",
          code: decision.reason,
          details: {
            moduleCode,
            entityCode,
            actionCode,
            source: decision.source,
          },
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
