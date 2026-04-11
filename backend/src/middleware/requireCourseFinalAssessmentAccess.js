const courseProgressService = require("../services/courseProgressService");

async function requireCourseFinalAssessmentAccess(req, res, next) {
  try {
    const rawCourseId = req.params.courseId || req.body.courseId;
    const courseId = Number(rawCourseId);
    const userId = Number(req.currentUser?.id || req.user?.id);

    if (!courseId || !userId) {
      return res.status(400).json({ error: "Некорректные параметры доступа к итоговой аттестации" });
    }

    const access = await courseProgressService.validateFinalAssessmentAccess({ courseId, userId });
    req.courseFinalAccess = access;
    return next();
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        error: error.message,
        meta: error.meta || undefined,
      });
    }
    return next(error);
  }
}

module.exports = requireCourseFinalAssessmentAccess;
