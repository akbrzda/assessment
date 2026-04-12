const permissionsController = require("../../../controllers/adminPermissionsController");

module.exports = {
  getSystemModules: permissionsController.getSystemModules,
  getUserPermissions: permissionsController.getUserPermissions,
  updateUserPermissions: permissionsController.updateUserPermissions,
  checkUserAccess: permissionsController.checkUserAccess,
};
