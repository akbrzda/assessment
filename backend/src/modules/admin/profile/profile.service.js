const handlers = require("./profile.handlers.js");

async function getProfile(req, res, next) {
  return handlers.getProfile(req, res, next);
}

async function updateProfile(req, res, next) {
  return handlers.updateProfile(req, res, next);
}

module.exports = {
  getProfile,
  updateProfile,
};


