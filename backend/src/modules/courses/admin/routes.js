const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const controller = require("./controller");

const router = express.Router();

router.use(verifyJWT);
router.use(checkModuleAccess("courses"));

router.get("/", controller.listCourses);
router.post("/", controller.createCourse);
router.get("/:id", controller.getCourse);
router.patch("/:id", controller.updateCourse);
router.delete("/:id", controller.deleteCourse);
router.post("/:id/publish", controller.publishCourse);
router.post("/:id/archive", controller.archiveCourse);

router.post("/:id/sections", controller.createSection);
router.patch("/:id/sections/reorder", controller.reorderSections);
router.patch("/sections/:sectionId", controller.updateSection);
router.delete("/sections/:sectionId", controller.deleteSection);

router.post("/sections/:sectionId/topics", controller.createTopic);
router.patch("/:id/sections/:sectionId/topics/reorder", controller.reorderTopics);
router.patch("/topics/:topicId", controller.updateTopic);
router.delete("/topics/:topicId", controller.deleteTopic);

// Назначения: целевые должности и филиалы
router.get("/:id/targets", controller.getTargets);
router.put("/:id/targets", controller.updateTargets);

// Назначения: ручные назначения пользователей
router.get("/:id/assignments", controller.getAssignments);
router.post("/:id/assignments", controller.addAssignment);
router.post("/:id/assignments/:userId/close", controller.closeAssignment);
router.delete("/:id/assignments/:userId", controller.removeAssignment);

// Прогресс пользователей
router.get("/:id/users", controller.getCourseUsers);
router.get("/:id/users/:userId/progress", controller.getCourseUserProgress);
router.delete("/:id/users/:userId/progress", controller.resetCourseUserProgress);

// Аналитика
router.get("/analytics/funnel", controller.getAnalyticsFunnel);
router.get("/:id/analytics/sections", controller.getSectionFailures);
router.get("/:id/analytics/progress-report", controller.getCourseProgressReport);

module.exports = router;
