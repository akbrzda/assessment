const service = require("./service");

async function globalSearch(req, res, next) {
  try {
    return await service.globalSearch(req, res, next);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  globalSearch,
};
