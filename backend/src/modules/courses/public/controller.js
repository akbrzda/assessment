const coursesService = require("./service");
const {
  assertCourseId,
  assertFinalAttemptParams,
  assertModuleAttemptParams,
} = require("./validators");

function handleControllerError(error, res, next) {
  if (error.status) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  next(error);
}

async function listCourses(req, res, next) {
  try {
    const courses = await coursesService.listCourses(req.currentUser.id);
    res.json({ courses });
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function getCourse(req, res, next) {
  try {
    const courseId = assertCourseId(req.params.id);
    const course = await coursesService.getCourse(courseId, req.currentUser.id);
    if (!course) {
      return res.status(404).json({ error: "Курс не найден или недоступен" });
    }

    res.json({ course });
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function startCourse(req, res, next) {
  try {
    const courseId = assertCourseId(req.params.id);
    const course = await coursesService.startCourse(courseId, req.currentUser.id);
    res.status(201).json({ course });
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function getCourseProgress(req, res, next) {
  try {
    const courseId = assertCourseId(req.params.id);
    const payload = await coursesService.getCourseProgress(courseId, req.currentUser.id);
    res.json(payload);
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function completeModuleAttempt(req, res, next) {
  try {
    const params = assertModuleAttemptParams({
      moduleId: req.params.moduleId,
      attemptId: req.params.attemptId,
    });

    const payload = await coursesService.completeModuleAttempt({
      ...params,
      userId: req.currentUser.id,
    });

    res.json(payload);
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function getFinalAssessmentAccess(req, res, next) {
  try {
    const courseId = assertCourseId(req.params.courseId);
    const payload = await coursesService.getFinalAssessmentAccess(courseId, req.currentUser.id);
    res.json(payload);
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function completeFinalAttempt(req, res, next) {
  try {
    const params = assertFinalAttemptParams({
      courseId: req.params.courseId,
      attemptId: req.params.attemptId,
    });

    const payload = await coursesService.completeFinalAttempt({
      ...params,
      userId: req.currentUser.id,
    });

    res.json(payload);
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

module.exports = {
  listCourses,
  getCourse,
  startCourse,
  getCourseProgress,
  completeModuleAttempt,
  getFinalAssessmentAccess,
  completeFinalAttempt,
};
