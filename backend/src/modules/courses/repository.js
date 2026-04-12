const courseModel = require("../../models/courseModel");

async function listPublishedCoursesForUser(userId) {
  return courseModel.listPublishedCoursesForUser(userId);
}

async function getCourseForUser(courseId, userId) {
  return courseModel.getCourseForUser(courseId, userId);
}

async function findCourseById(courseId) {
  return courseModel.findById(courseId);
}

async function getCourseProgressForUser(courseId, userId) {
  return courseModel.getCourseProgressForUser(courseId, userId);
}

async function canAccessFinalAssessment(params) {
  return courseModel.canAccessFinalAssessment(params);
}

module.exports = {
  listPublishedCoursesForUser,
  getCourseForUser,
  findCourseById,
  getCourseProgressForUser,
  canAccessFinalAssessment,
};
