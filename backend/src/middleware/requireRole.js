function requireRole(allowedRoles, options = {}) {
  const {
    userResolver = (req) => req.currentUser,
    roleField = "roleName",
    unauthorizedStatus = 403,
    forbiddenStatus = 403,
    unauthorizedMessage = "Доступ запрещён",
    forbiddenMessage = "Доступ запрещён",
  } = options;

  return (req, res, next) => {
    const user = userResolver(req);

    if (!user) {
      return res.status(unauthorizedStatus).json({ error: unauthorizedMessage });
    }

    const role = user[roleField];
    if (!allowedRoles.includes(role)) {
      return res.status(forbiddenStatus).json({ error: forbiddenMessage });
    }

    next();
  };
}

module.exports = requireRole;
