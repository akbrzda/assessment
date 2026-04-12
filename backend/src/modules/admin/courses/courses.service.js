const handlers = require("./courses.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function listCourses(req) {
  return runLegacyHandler(handlers.listCourses, req);
}

async function getCourse(req) {
  return runLegacyHandler(handlers.getCourse, req);
}

async function createCourse(req) {
  return runLegacyHandler(handlers.createCourse, req);
}

async function updateCourse(req) {
  return runLegacyHandler(handlers.updateCourse, req);
}

async function deleteCourse(req) {
  return runLegacyHandler(handlers.deleteCourse, req);
}

async function publishCourse(req) {
  return runLegacyHandler(handlers.publishCourse, req);
}

async function archiveCourse(req) {
  return runLegacyHandler(handlers.archiveCourse, req);
}

async function createModule(req) {
  return runLegacyHandler(handlers.createModule, req);
}

async function updateModule(req) {
  return runLegacyHandler(handlers.updateModule, req);
}

async function deleteModule(req) {
  return runLegacyHandler(handlers.deleteModule, req);
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
