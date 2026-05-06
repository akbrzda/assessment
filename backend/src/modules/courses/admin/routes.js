const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const { requirePermission } = require("../../../middleware/permission");
const CoursePolicy = require("../../../policies/CoursePolicy");
const { pool } = require("../../../config/database");
const controller = require("./controller");

const router = express.Router();

router.use(verifyJWT);
router.use(checkModuleAccess("courses"));

async function ensureCourseProgressPolicy(req, res, next) {
  try {
    const targetUserId = Number(req.params.userId);
    if (!targetUserId || targetUserId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор пользователя" });
    }

    const [rows] = await pool.query("SELECT id, branch_id FROM users WHERE id = ? LIMIT 1", [targetUserId]);
    if (!rows.length) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    if (!CoursePolicy.viewProgress(req.user, rows[0])) {
      return res.status(403).json({ error: "Доступ запрещен" });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

router.get("/", requirePermission("courses", "course", "read"), controller.listCourses);
router.get("/media-library", controller.listCourseMedia);
router.delete("/media-library", controller.deleteCourseMedia);
router.get("/analytics/funnel", controller.getAnalyticsFunnel);
router.post("/", requirePermission("courses", "course", "create"), controller.createCourse);
router.get("/:id", controller.getCourse);
router.get("/:id/preview", controller.getCoursePreview);
router.patch("/:id", requirePermission("courses", "course", "update"), controller.updateCourse);
router.post("/:id/upload-cover", controller.uploadCourseCover);
router.post("/upload-media", controller.uploadCourseMedia);
router.delete("/:id", requirePermission("courses", "course", "delete"), controller.deleteCourse);
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
router.get(
  "/:id/users/:userId/progress",
  requirePermission("courses", "course", "read", {
    contextBuilder: (req) => ({
      courseId: Number(req.params.id),
      targetUserId: Number(req.params.userId),
    }),
  }),
  ensureCourseProgressPolicy,
  controller.getCourseUserProgress,
);
router.delete("/:id/users/:userId/progress", controller.resetCourseUserProgress);

// Аналитика
router.get("/:id/analytics/sections", controller.getSectionFailures);
router.get("/:id/analytics/progress-report", controller.getCourseProgressReport);

module.exports = router;
