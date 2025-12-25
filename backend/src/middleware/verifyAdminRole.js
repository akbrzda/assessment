/**
 * Middleware для проверки роли пользователя
 * @param {Array} allowedRoles - массив разрешённых ролей ['superadmin', 'manager']
 */
module.exports = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Не авторизован" });
    }

    const { role } = req.user;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    next();
  };
};
