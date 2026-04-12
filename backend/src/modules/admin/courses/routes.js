const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const coursesController = require("./courses.controller");

const router = express.Router();

router.use(verifyJWT);
router.use(checkModuleAccess("courses"));

router.get("/", coursesController.listCourses);
router.get("/:id", coursesController.getCourse);
router.post("/", coursesController.createCourse);
router.patch("/:id", coursesController.updateCourse);
router.delete("/:id", coursesController.deleteCourse);
router.post("/:id/publish", coursesController.publishCourse);
router.post("/:id/archive", coursesController.archiveCourse);
router.post("/:id/modules", coursesController.createModule);
router.patch("/modules/:moduleId", coursesController.updateModule);
router.delete("/modules/:moduleId", coursesController.deleteModule);

module.exports = router;
