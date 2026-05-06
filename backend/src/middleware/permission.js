const permissionService = require("../services/PermissionService");

function requirePermission(moduleCode, entityCode, actionCode, options = {}) {
  return async (req, res, next) => {
    try {
      const context = options.contextBuilder ? options.contextBuilder(req) : {};
      const decision = await permissionService.can(req.user, moduleCode, entityCode, actionCode, context);

      if (!decision.allowed) {
        const status = req.user?.id ? 403 : 401;
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
