const jwt = require("jsonwebtoken");
const config = require("../config/env");

/**
 * Middleware для проверки JWT токена
 */
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Токен отсутствует" });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // { id, role }
    next();
  } catch (error) {
    return res.status(401).json({ error: "Недействительный токен" });
  }
};
