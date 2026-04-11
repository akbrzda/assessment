const { isCoursesEnabledForUser } = require("../services/coursesFeatureService");

async function requireCoursesFeature(req, res, next) {
  try {
    const user = req.currentUser || req.user || null;
    const enabled = await isCoursesEnabledForUser(user);

    if (!enabled) {
      return res.status(404).json({ error: "Модуль курсов временно недоступен" });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireCoursesFeature;
