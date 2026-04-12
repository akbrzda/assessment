const settingsService = require("./service");

async function getSettings(req, res, next) {
  try {
    return await settingsService.getSettings(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getSettingByKey(req, res, next) {
  try {
    return await settingsService.getSettingByKey(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function createSetting(req, res, next) {
  try {
    return await settingsService.createSetting(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateSetting(req, res, next) {
  try {
    return await settingsService.updateSetting(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteSetting(req, res, next) {
  try {
    return await settingsService.deleteSetting(req, res, next);
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




