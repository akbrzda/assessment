const rulesService = require("./gamification-rules.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function list(req, res, next) {
  try {
    const result = await rulesService.list(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const result = await rulesService.getById(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await rulesService.create(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await rulesService.update(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await rulesService.remove(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function dryRun(req, res, next) {
  try {
    const result = await rulesService.dryRun(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  dryRun,
};
