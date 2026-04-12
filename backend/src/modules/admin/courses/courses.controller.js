const coursesService = require("./courses.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function listCourses(req, res, next) {
  try {
    const result = await coursesService.listCourses(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getCourse(req, res, next) {
  try {
    const result = await coursesService.getCourse(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function createCourse(req, res, next) {
  try {
    const result = await coursesService.createCourse(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateCourse(req, res, next) {
  try {
    const result = await coursesService.updateCourse(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const result = await coursesService.deleteCourse(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function publishCourse(req, res, next) {
  try {
    const result = await coursesService.publishCourse(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function archiveCourse(req, res, next) {
  try {
    const result = await coursesService.archiveCourse(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function createModule(req, res, next) {
  try {
    const result = await coursesService.createModule(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateModule(req, res, next) {
  try {
    const result = await coursesService.updateModule(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteModule(req, res, next) {
  try {
    const result = await coursesService.deleteModule(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
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
