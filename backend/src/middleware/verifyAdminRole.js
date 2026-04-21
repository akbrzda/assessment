const requireRole = require("./requireRole");

/**
 * Middleware для проверки роли администратора.
 * Использует общий requireRole с другим источником пользователя.
 * @param {Array} allowedRoles
 */
module.exports = (allowedRoles) =>
  requireRole(allowedRoles, {
    userResolver: (req) => req.user,
    roleField: "role",
    unauthorizedStatus: 401,
    forbiddenStatus: 403,
    unauthorizedMessage: "Не авторизован",
    forbiddenMessage: "Доступ запрещён",
  });
