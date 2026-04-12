const adminAuthController = require("../../../controllers/adminAuthController");

module.exports = {
  login: adminAuthController.login,
  refresh: adminAuthController.refresh,
  logout: adminAuthController.logout,
};
