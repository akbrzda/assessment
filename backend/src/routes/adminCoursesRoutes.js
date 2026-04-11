const express = require("express");
const verifyJWT = require("../middleware/verifyJWT");
const checkModuleAccess = require("../middleware/checkModuleAccess");
const adminCourseController = require("../controllers/adminCourseController");

const router = express.Router();

router.use(verifyJWT);
router.use(checkModuleAccess("courses"));

router.get("/", adminCourseController.listCourses);
router.get("/:id", adminCourseController.getCourse);
router.post("/", adminCourseController.createCourse);
router.patch("/:id", adminCourseController.updateCourse);
router.delete("/:id", adminCourseController.deleteCourse);
router.post("/:id/publish", adminCourseController.publishCourse);
router.post("/:id/archive", adminCourseController.archiveCourse);

router.post("/:id/modules", adminCourseController.createModule);
router.patch("/modules/:moduleId", adminCourseController.updateModule);
router.delete("/modules/:moduleId", adminCourseController.deleteModule);

module.exports = router;
