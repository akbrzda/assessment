const coursesRepo = require("../courses.repository");
const userViewRepo = require("../userCourseView.repository");

async function listPublishedCoursesForUser(userId) {
  return userViewRepo.listPublishedCoursesForUser(userId);
}

async function getCourseForUser(courseId, userId) {
  return userViewRepo.getCourseForUser(courseId, userId);
}

async function findCourseById(courseId) {
  return coursesRepo.findById(courseId);
}

async function getCourseProgressForUser(courseId, userId) {
  return userViewRepo.getCourseProgressForUser(courseId, userId);
}

async function canAccessFinalAssessment(params) {
  return coursesRepo.canAccessFinalAssessment(params);
}

module.exports = {
  listPublishedCoursesForUser,
  getCourseForUser,
  findCourseById,
  getCourseProgressForUser,
  canAccessFinalAssessment,
};
