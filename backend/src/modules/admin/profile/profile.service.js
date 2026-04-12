const handlers = require("./profile.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function getProfile(req) {
  return runLegacyHandler(handlers.getProfile, req);
}

async function updateProfile(req) {
  return runLegacyHandler(handlers.updateProfile, req);
}

module.exports = {
  getProfile,
  updateProfile,
};
