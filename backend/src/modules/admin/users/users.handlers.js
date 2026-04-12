const adminUserController = require("../../../controllers/adminUserController");

module.exports = {
  listUsers: adminUserController.listUsers,
  exportUsersToExcel: adminUserController.exportUsersToExcel,
  getUserDetailedStats: adminUserController.getUserDetailedStats,
  getUserById: adminUserController.getUserById,
  createUser: adminUserController.createUser,
  updateUser: adminUserController.updateUser,
  deleteUser: adminUserController.deleteUser,
  resetPassword: adminUserController.resetPassword,
  resetAssessmentProgress: adminUserController.resetAssessmentProgress,
};
