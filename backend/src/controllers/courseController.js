const courseModel = require("../models/courseModel");
const courseProgressService = require("../services/courseProgressService");

function parseId(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : 0;
}

async function listCourses(req, res, next) {
  try {
    const courses = await courseModel.listPublishedCoursesForUser(req.currentUser.id);
    res.json({ courses });
  } catch (error) {
    next(error);
  }
}

async function getCourse(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) {
      return res.status(400).json({ error: "Некорректный идентификатор курса" });
    }

    const course = await courseModel.getCourseForUser(courseId, req.currentUser.id);
    if (!course) {
      return res.status(404).json({ error: "Курс не найден или недоступен" });
    }

    res.json({ course });
  } catch (error) {
    next(error);
  }
}

async function startCourse(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) {
      return res.status(400).json({ error: "Некорректный идентификатор курса" });
    }

    await courseProgressService.startCourse({
      courseId,
      userId: req.currentUser.id,
    });

    const course = await courseModel.getCourseForUser(courseId, req.currentUser.id);
    res.status(201).json({ course });
  } catch (error) {
    next(error);
  }
}

async function getCourseProgress(req, res, next) {
  try {
    const courseId = parseId(req.params.id);
    if (!courseId) {
      return res.status(400).json({ error: "Некорректный идентификатор курса" });
    }

    const course = await courseModel.findById(courseId);
    if (!course || course.status !== "published") {
      return res.status(404).json({ error: "Курс не найден или недоступен" });
    }

    const progress = await courseModel.getCourseProgressForUser(courseId, req.currentUser.id);
    const finalAccess = await courseModel.canAccessFinalAssessment({
      courseId,
      userId: req.currentUser.id,
    });

    res.json({
      progress,
      finalAssessment: {
        available: finalAccess.allowed,
        reason: finalAccess.allowed ? null : finalAccess.reason,
        finalAssessmentId: finalAccess.finalAssessmentId || course.finalAssessmentId,
        passedRequiredModules: finalAccess.passedRequiredModules || 0,
        totalRequiredModules: finalAccess.totalRequiredModules || progress.totalModulesCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function completeModuleAttempt(req, res, next) {
  try {
    const moduleId = parseId(req.params.moduleId);
    const attemptId = parseId(req.params.attemptId);

    if (!moduleId || !attemptId) {
      return res.status(400).json({ error: "Некорректные параметры попытки модуля" });
    }

    const result = await courseProgressService.handleModuleAttemptCompletion({
      moduleId,
      userId: req.currentUser.id,
      attemptId,
    });

    res.json({
      module: {
        id: result.moduleAttemptResult.moduleId,
        assessmentId: result.moduleAttemptResult.assessmentId,
        attemptId: result.moduleAttemptResult.attemptId,
        attemptNumber: result.moduleAttemptResult.attemptNumber,
        scorePercent: result.moduleAttemptResult.scorePercent,
        passScorePercent: result.moduleAttemptResult.passScorePercent,
        passed: result.moduleAttemptResult.passed,
      },
      progress: {
        progressPercent: result.aggregate.progressPercent,
        passedRequiredModules: result.aggregate.passedRequiredModules,
        totalRequiredModules: result.aggregate.totalRequiredModules,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getFinalAssessmentAccess(req, res, next) {
  try {
    const courseId = parseId(req.params.courseId);
    if (!courseId) {
      return res.status(400).json({ error: "Некорректный идентификатор курса" });
    }

    const finalAccess = await courseModel.canAccessFinalAssessment({
      courseId,
      userId: req.currentUser.id,
    });

    res.json({
      finalAssessment: {
        available: finalAccess.allowed,
        finalAssessmentId: finalAccess.finalAssessmentId || null,
        reason: finalAccess.allowed ? null : finalAccess.reason,
        passedRequiredModules: finalAccess.passedRequiredModules || 0,
        totalRequiredModules: finalAccess.totalRequiredModules || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function completeFinalAttempt(req, res, next) {
  try {
    const courseId = parseId(req.params.courseId);
    const attemptId = parseId(req.params.attemptId);

    if (!courseId || !attemptId) {
      return res.status(400).json({ error: "Некорректные параметры итоговой попытки" });
    }

    const result = await courseProgressService.handleFinalAttemptCompletion({
      courseId,
      userId: req.currentUser.id,
      attemptId,
    });

    res.json({
      finalAttempt: {
        attemptId: result.finalAttempt.attemptId,
        attemptNumber: result.finalAttempt.attemptNumber,
        scorePercent: result.finalAttempt.scorePercent,
        passScorePercent: result.finalAttempt.passScorePercent,
        passed: result.finalAttempt.passed,
      },
      course: {
        id: result.finalAttempt.courseId,
        completed: result.passedCourse,
      },
    });
  } catch (error) {
    next(error);
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
