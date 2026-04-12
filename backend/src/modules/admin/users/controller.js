const moduleService = require("./service");

async function listUsers(req, res, next) {
  try {
    return await moduleService.listUsers(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function exportUsersToExcel(req, res, next) {
  try {
    return await moduleService.exportUsersToExcel(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserDetailedStats(req, res, next) {
  try {
    return await moduleService.getUserDetailedStats(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    return await moduleService.getUserById(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    return await moduleService.createUser(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    return await moduleService.updateUser(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    return await moduleService.deleteUser(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    return await moduleService.resetPassword(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function resetAssessmentProgress(req, res, next) {
  try {
    return await moduleService.resetAssessmentProgress(req, res, next);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  exportUsersToExcel,
  getUserDetailedStats,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  resetAssessmentProgress,
};


