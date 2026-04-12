const adminProfileController = require("../../../controllers/adminProfileController");

module.exports = {
  getProfile: adminProfileController.getProfile,
  updateProfile: adminProfileController.updateProfile,
};
