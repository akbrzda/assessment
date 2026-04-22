const profileService = require("./service");

async function getProfile(req, res, next) {
  try {
    return await profileService.getProfile(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    return await profileService.updateProfile(req, res, next);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
};




