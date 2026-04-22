const coursesService = require("./service");
const {
  assertCourseId,
  assertCourseSectionParams,
  assertCourseTopicParams,
  assertFinalAttemptParams,
  assertModuleAttemptParams,
  assertTopicId,
  assertTopicAttemptParams,
  assertSectionAttemptParams,
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
    const { id, positionId, branchId } = req.currentUser;
    const courses = await coursesService.listCourses(id, positionId, branchId);
    res.json({ courses });
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function getCourse(req, res, next) {
  try {
    const courseId = assertCourseId(req.params.id);
    const { id, positionId, branchId } = req.currentUser;
    const course = await coursesService.getCourse(courseId, id, { positionId, branchId });
    if (!course) {
      return res.status(404).json({ error: "Курс не найден или недоступен" });
    }

    res.json({ course });
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function getCourseSection(req, res, next) {
  try {
    const params = assertCourseSectionParams({
      courseId: req.params.courseId,
      sectionId: req.params.sectionId,
    });
    const { id, positionId, branchId } = req.currentUser;
    const payload = await coursesService.getCourseSection(params.courseId, params.sectionId, id, { positionId, branchId });
    if (!payload?.section) {
      return res.status(404).json({ error: "Тема курса не найдена или недоступна" });
    }

    res.json(payload);
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function startCourse(req, res, next) {
  try {
    const courseId = assertCourseId(req.params.id);
    const { id, positionId, branchId } = req.currentUser;
    const course = await coursesService.startCourse(courseId, id, { positionId, branchId });
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

async function viewTopicMaterial(req, res, next) {
  try {
    const topicId = assertTopicId(req.params.topicId);
    const payload = await coursesService.viewTopicMaterial({ topicId, userId: req.currentUser.id });
    res.json(payload);
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function startTopic(req, res, next) {
  try {
    const params = assertCourseTopicParams({
      courseId: req.params.courseId,
      topicId: req.params.topicId,
    });
    const payload = await coursesService.startTopic({
      ...params,
      userId: req.currentUser.id,
    });
    res.status(201).json(payload);
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function completeTopic(req, res, next) {
  try {
    const params = assertCourseTopicParams({
      courseId: req.params.courseId,
      topicId: req.params.topicId,
    });
    const payload = await coursesService.completeTopic({
      ...params,
      userId: req.currentUser.id,
    });
    res.json(payload);
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function completeTopicAttempt(req, res, next) {
  try {
    const params = assertTopicAttemptParams({
      topicId: req.params.topicId,
      attemptId: req.params.attemptId,
    });
    const payload = await coursesService.completeTopicAttempt({ ...params, userId: req.currentUser.id });
    res.json(payload);
  } catch (error) {
    handleControllerError(error, res, next);
  }
}

async function completeSectionAttempt(req, res, next) {
  try {
    const params = assertSectionAttemptParams({
      sectionId: req.params.sectionId,
      attemptId: req.params.attemptId,
    });
    const payload = await coursesService.completeSectionAttempt({ ...params, userId: req.currentUser.id });
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
  getCourseSection,
  startCourse,
  startTopic,
  completeTopic,
  getCourseProgress,
  viewTopicMaterial,
  completeTopicAttempt,
  completeSectionAttempt,
  completeModuleAttempt,
  getFinalAssessmentAccess,
  completeFinalAttempt,
};
