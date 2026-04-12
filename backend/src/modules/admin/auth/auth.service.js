const handlers = require("./auth.handlers.js");

async function login(req, res, next) {
  return handlers.login(req, res, next);
}

async function refresh(req, res, next) {
  return handlers.refresh(req, res, next);
}

async function logout(req, res, next) {
  return handlers.logout(req, res, next);
}

module.exports = {
  login,
  refresh,
  logout,
};
