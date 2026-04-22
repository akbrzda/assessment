const express = require("express");
const verifyInitData = require("../../../middleware/verifyInitData");
const resolveUser = require("../../../middleware/resolveUser");
const requireRole = require("../../../middleware/requireRole");
const requireCourseFinalAssessmentAccess = require("../../../middleware/requireCourseFinalAssessmentAccess");
const coursesController = require("./controller");

const router = express.Router();

router.use(verifyInitData, resolveUser, requireRole(["employee", "manager", "superadmin"]));

router.post("/:courseId/topics/:topicId/start", coursesController.startTopic);
router.post("/:courseId/topics/:topicId/complete", coursesController.completeTopic);
router.post("/topics/:topicId/view-material", coursesController.viewTopicMaterial);
router.post("/topics/:topicId/attempts/:attemptId/complete", coursesController.completeTopicAttempt);
router.post("/sections/:sectionId/attempts/:attemptId/complete", coursesController.completeSectionAttempt);
// Алиас для обратной совместимости
router.post("/modules/:moduleId/attempts/:attemptId/complete", coursesController.completeModuleAttempt);
router.get("/:courseId/final-assessment/access", coursesController.getFinalAssessmentAccess);
router.post("/:courseId/final-assessment/attempts/:attemptId/complete", requireCourseFinalAssessmentAccess, coursesController.completeFinalAttempt);

router.get("/", coursesController.listCourses);
router.get("/:courseId/sections/:sectionId", coursesController.getCourseSection);
router.get("/:id", coursesController.getCourse);
router.post("/:id/start", coursesController.startCourse);
router.get("/:id/progress", coursesController.getCourseProgress);

module.exports = router;
