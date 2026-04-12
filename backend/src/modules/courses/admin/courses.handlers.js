const adminCourseController = require("../../../controllers/adminCourseController");

module.exports = {
  listCourses: adminCourseController.listCourses,
  getCourse: adminCourseController.getCourse,
  createCourse: adminCourseController.createCourse,
  updateCourse: adminCourseController.updateCourse,
  deleteCourse: adminCourseController.deleteCourse,
  publishCourse: adminCourseController.publishCourse,
  archiveCourse: adminCourseController.archiveCourse,
  createModule: adminCourseController.createModule,
  updateModule: adminCourseController.updateModule,
  deleteModule: adminCourseController.deleteModule,
};
