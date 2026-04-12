const handlers = require("./auth.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function login(req) {
  return runLegacyHandler(handlers.login, req);
}

async function refresh(req) {
  return runLegacyHandler(handlers.refresh, req);
}

async function logout(req) {
  return runLegacyHandler(handlers.logout, req);
}

module.exports = {
  login,
  refresh,
  logout,
};
