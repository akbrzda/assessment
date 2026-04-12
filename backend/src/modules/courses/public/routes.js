const express = require("express");
const verifyInitData = require("../../../middleware/verifyInitData");
const resolveUser = require("../../../middleware/resolveUser");
const requireRole = require("../../../middleware/requireRole");
const requireCoursesFeature = require("../../../middleware/requireCoursesFeature");
const requireCourseFinalAssessmentAccess = require("../../../middleware/requireCourseFinalAssessmentAccess");
const coursesController = require("./controller");

const router = express.Router();

router.use(
  verifyInitData,
  resolveUser,
  requireRole(["employee", "manager", "superadmin"]),
  requireCoursesFeature
);

router.post("/modules/:moduleId/attempts/:attemptId/complete", coursesController.completeModuleAttempt);
router.get("/:courseId/final-assessment/access", coursesController.getFinalAssessmentAccess);
router.post(
  "/:courseId/final-assessment/attempts/:attemptId/complete",
  requireCourseFinalAssessmentAccess,
  coursesController.completeFinalAttempt
);

router.get("/", coursesController.listCourses);
router.get("/:id", coursesController.getCourse);
router.post("/:id/start", coursesController.startCourse);
router.get("/:id/progress", coursesController.getCourseProgress);

module.exports = router;

