const legacyService = require("./legacy.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function getAdminReferences(req, res, next) {
  try {
    const result = await legacyService.getAdminReferences(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const result = await legacyService.listUsers(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const result = await legacyService.updateUser(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const result = await legacyService.deleteUser(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function listBranches(req, res, next) {
  try {
    const result = await legacyService.listBranches(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function createBranch(req, res, next) {
  try {
    const result = await legacyService.createBranch(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateBranch(req, res, next) {
  try {
    const result = await legacyService.updateBranch(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteBranch(req, res, next) {
  try {
    const result = await legacyService.deleteBranch(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAdminReferences,
  listUsers,
  updateUser,
  deleteUser,
  listBranches,
  createBranch,
  updateBranch,
  deleteBranch,
};
