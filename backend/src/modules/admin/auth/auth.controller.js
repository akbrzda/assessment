const handlers = require("./auth.handlers");

async function login(req, res, next) {
  try {
    return await handlers.login(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    return await handlers.refresh(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    return await handlers.logout(req, res, next);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  refresh,
  logout,
};
