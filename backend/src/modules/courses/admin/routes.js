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
router.patch("/sections/:sectionId", controller.updateSection);
router.delete("/sections/:sectionId", controller.deleteSection);

router.post("/sections/:sectionId/topics", controller.createTopic);
router.patch("/topics/:topicId", controller.updateTopic);
router.delete("/topics/:topicId", controller.deleteTopic);

module.exports = router;
