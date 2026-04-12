const handlers = require("./settings.handlers.js");

async function getSettings(req, res, next) {
  return handlers.getSettings(req, res, next);
}

async function getSettingByKey(req, res, next) {
  return handlers.getSettingByKey(req, res, next);
}

async function createSetting(req, res, next) {
  return handlers.createSetting(req, res, next);
}

async function updateSetting(req, res, next) {
  return handlers.updateSetting(req, res, next);
}

async function deleteSetting(req, res, next) {
  return handlers.deleteSetting(req, res, next);
}

module.exports = {
  getSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
};


