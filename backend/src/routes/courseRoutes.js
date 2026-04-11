const express = require("express");
const courseController = require("../controllers/courseController");
const verifyInitData = require("../middleware/verifyInitData");
const resolveUser = require("../middleware/resolveUser");
const requireRole = require("../middleware/requireRole");
const requireCoursesFeature = require("../middleware/requireCoursesFeature");
const requireCourseFinalAssessmentAccess = require("../middleware/requireCourseFinalAssessmentAccess");

const router = express.Router();

router.use(verifyInitData, resolveUser, requireRole(["employee", "manager", "superadmin"]), requireCoursesFeature);

router.post("/modules/:moduleId/attempts/:attemptId/complete", courseController.completeModuleAttempt);
router.get("/:courseId/final-assessment/access", courseController.getFinalAssessmentAccess);
router.post(
  "/:courseId/final-assessment/attempts/:attemptId/complete",
  requireCourseFinalAssessmentAccess,
  courseController.completeFinalAttempt,
);

router.get("/", courseController.listCourses);
router.get("/:id", courseController.getCourse);
router.post("/:id/start", courseController.startCourse);
router.get("/:id/progress", courseController.getCourseProgress);

module.exports = router;
