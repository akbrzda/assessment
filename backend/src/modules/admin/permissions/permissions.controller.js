const permissionsService = require("./permissions.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function getSystemModules(req, res, next) {
  try {
    const result = await permissionsService.getSystemModules(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getUserPermissions(req, res, next) {
  try {
    const result = await permissionsService.getUserPermissions(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateUserPermissions(req, res, next) {
  try {
    const result = await permissionsService.updateUserPermissions(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function checkUserAccess(req, res, next) {
  try {
    const result = await permissionsService.checkUserAccess(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSystemModules,
  getUserPermissions,
  updateUserPermissions,
  checkUserAccess,
};
