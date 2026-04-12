const usersService = require("./users.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function listUsers(req, res, next) {
  try {
    const result = await usersService.listUsers(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function exportUsersToExcel(req, res, next) {
  try {
    const result = await usersService.exportUsersToExcel(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getUserDetailedStats(req, res, next) {
  try {
    const result = await usersService.getUserDetailedStats(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const result = await usersService.getUserById(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const result = await usersService.createUser(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const result = await usersService.updateUser(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const result = await usersService.deleteUser(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await usersService.resetPassword(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function resetAssessmentProgress(req, res, next) {
  try {
    const result = await usersService.resetAssessmentProgress(req);
    return sendLegacyResult(res, result);
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
