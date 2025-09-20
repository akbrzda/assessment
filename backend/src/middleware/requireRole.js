function requireRole(allowedRoles) {
  return (req, res, next) => {
    const user = req.currentUser;
    if (!user || !allowedRoles.includes(user.roleName)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = requireRole;
