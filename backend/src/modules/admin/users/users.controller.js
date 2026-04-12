const handlers = require("./users.handlers");

async function listUsers(req, res, next) {
  try {
    return await handlers.listUsers(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function exportUsersToExcel(req, res, next) {
  try {
    return await handlers.exportUsersToExcel(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserDetailedStats(req, res, next) {
  try {
    return await handlers.getUserDetailedStats(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    return await handlers.getUserById(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    return await handlers.createUser(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    return await handlers.updateUser(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    return await handlers.deleteUser(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    return await handlers.resetPassword(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function resetAssessmentProgress(req, res, next) {
  try {
    return await handlers.resetAssessmentProgress(req, res, next);
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
