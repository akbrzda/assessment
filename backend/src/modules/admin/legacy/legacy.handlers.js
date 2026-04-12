const adminUserController = require("../../../controllers/adminUserController");
const branchController = require("../../../controllers/branchController");
const authController = require("../../../controllers/authController");

module.exports = {
  getAdminReferences: authController.getAdminReferences,
  listUsers: adminUserController.listUsers,
  updateUser: adminUserController.updateUser,
  deleteUser: adminUserController.deleteUser,
  listBranches: branchController.listBranches,
  createBranch: branchController.createBranch,
  updateBranch: branchController.updateBranch,
  deleteBranch: branchController.deleteBranch,
};
