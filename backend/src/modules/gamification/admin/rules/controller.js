const rulesService = require("./service");

async function list(req, res, next) {
  try {
    return await rulesService.list(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    return await rulesService.getById(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    return await rulesService.create(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    return await rulesService.update(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    return await rulesService.remove(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function dryRun(req, res, next) {
  try {
    return await rulesService.dryRun(req, res, next);
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


