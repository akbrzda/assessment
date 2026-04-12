const coursesService = require("./service");

async function listCourses(req, res, next) {
  try {
    return await coursesService.listCourses(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getCourse(req, res, next) {
  try {
    return await coursesService.getCourse(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function createCourse(req, res, next) {
  try {
    return await coursesService.createCourse(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateCourse(req, res, next) {
  try {
    return await coursesService.updateCourse(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteCourse(req, res, next) {
  try {
    return await coursesService.deleteCourse(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function publishCourse(req, res, next) {
  try {
    return await coursesService.publishCourse(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function archiveCourse(req, res, next) {
  try {
    return await coursesService.archiveCourse(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function createModule(req, res, next) {
  try {
    return await coursesService.createModule(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateModule(req, res, next) {
  try {
    return await coursesService.updateModule(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteModule(req, res, next) {
  try {
    return await coursesService.deleteModule(req, res, next);
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




