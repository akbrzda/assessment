const rolesService = require("./service");

async function list(req, res, next) {
  try {
    return await rolesService.list(req, res, next);
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    return await rolesService.getById(req, res, next);
  } catch (error) {
    return next(error);
  }
}

async function updatePermissions(req, res, next) {
  try {
    return await rolesService.updatePermissions(req, res, next);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  getById,
  updatePermissions,
};
