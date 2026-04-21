const permissionsService = require("./service");

async function getSystemModules(req, res, next) {
  try {
    return await permissionsService.getSystemModules(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getDefaultModules(req, res, next) {
  try {
    return await permissionsService.getDefaultModules(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserPermissions(req, res, next) {
  try {
    return await permissionsService.getUserPermissions(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateUserPermissions(req, res, next) {
  try {
    return await permissionsService.updateUserPermissions(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function checkUserAccess(req, res, next) {
  try {
    return await permissionsService.checkUserAccess(req, res, next);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSystemModules,
  getDefaultModules,
  getUserPermissions,
  updateUserPermissions,
  checkUserAccess,
};



