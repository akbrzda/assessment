const handlers = require("./settings.handlers.js");
const { runLegacyHandler } = require("../shared/legacy-handler-adapter");

async function getSettings(req) {
  return runLegacyHandler(handlers.getSettings, req);
}

async function getSettingByKey(req) {
  return runLegacyHandler(handlers.getSettingByKey, req);
}

async function createSetting(req) {
  return runLegacyHandler(handlers.createSetting, req);
}

async function updateSetting(req) {
  return runLegacyHandler(handlers.updateSetting, req);
}

async function deleteSetting(req) {
  return runLegacyHandler(handlers.deleteSetting, req);
}

module.exports = {
  getSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
};
