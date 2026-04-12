const settingsService = require("./settings.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function getSettings(req, res, next) {
  try {
    const result = await settingsService.getSettings(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function getSettingByKey(req, res, next) {
  try {
    const result = await settingsService.getSettingByKey(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function createSetting(req, res, next) {
  try {
    const result = await settingsService.createSetting(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateSetting(req, res, next) {
  try {
    const result = await settingsService.updateSetting(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function deleteSetting(req, res, next) {
  try {
    const result = await settingsService.deleteSetting(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
};
