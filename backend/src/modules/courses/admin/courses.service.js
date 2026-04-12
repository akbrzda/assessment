const handlers = require("./courses.handlers.js");

async function listCourses(req, res, next) {
  return handlers.listCourses(req, res, next);
}

async function getCourse(req, res, next) {
  return handlers.getCourse(req, res, next);
}

async function createCourse(req, res, next) {
  return handlers.createCourse(req, res, next);
}

async function updateCourse(req, res, next) {
  return handlers.updateCourse(req, res, next);
}

async function deleteCourse(req, res, next) {
  return handlers.deleteCourse(req, res, next);
}

async function publishCourse(req, res, next) {
  return handlers.publishCourse(req, res, next);
}

async function archiveCourse(req, res, next) {
  return handlers.archiveCourse(req, res, next);
}

async function createModule(req, res, next) {
  return handlers.createModule(req, res, next);
}

async function updateModule(req, res, next) {
  return handlers.updateModule(req, res, next);
}

async function deleteModule(req, res, next) {
  return handlers.deleteModule(req, res, next);
}

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  archiveCourse,
  createModule,
  updateModule,
  deleteModule,
};


