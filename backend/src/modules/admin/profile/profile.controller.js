const profileService = require("./profile.service");
const { sendLegacyResult } = require("../shared/legacy-handler-adapter");

async function getProfile(req, res, next) {
  try {
    const result = await profileService.getProfile(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const result = await profileService.updateProfile(req);
    return sendLegacyResult(res, result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
