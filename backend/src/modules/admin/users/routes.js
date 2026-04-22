const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const verifyAdminRole = require("../../../middleware/verifyAdminRole");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const canEditUser = require("../../../middleware/canEditUser");
const {
  cacheMiddleware,
  invalidateCacheMiddleware,
} = require("../../../middleware/cache");
const usersController = require("./controller");

const router = express.Router();

// Все маршруты защищены JWT и доступны через проверку модуля users
router.use(verifyJWT, checkModuleAccess("users"));

router.get("/", cacheMiddleware({ ttl: 60 }), usersController.listUsers);
router.get("/export/excel", usersController.exportUsersToExcel);
router.post(
  "/bulk/role",
  verifyAdminRole(["superadmin"]),
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/users/),
  usersController.bulkUpdateRole,
);
router.post(
  "/bulk/branch",
  verifyAdminRole(["superadmin"]),
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/users/),
  usersController.bulkTransferBranch,
);
router.post(
  "/bulk/export",
  verifyAdminRole(["superadmin", "manager"]),
  usersController.bulkExportUsers,
);
router.get("/:id/stats", cacheMiddleware({ ttl: 120 }), usersController.getUserDetailedStats);
router.get("/:id", cacheMiddleware({ ttl: 120 }), usersController.getUserById);
router.post(
  "/",
  verifyAdminRole(["superadmin"]),
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/users/),
  usersController.createUser,
);
router.patch(
  "/:id",
  canEditUser,
  invalidateCacheMiddleware(
    (req) => new RegExp(`^http:GET:.*\/api\/admin\/(users|assessments)(\/|\\?|$)`),
  ),
  usersController.updateUser,
);
router.delete(
  "/:id",
  verifyAdminRole(["superadmin"]),
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/users/),
  usersController.deleteUser,
);
router.post("/:id/reset-password", usersController.resetPassword);
router.delete(
  "/:userId/assessments/:assessmentId/progress",
  invalidateCacheMiddleware(
    (req) => new RegExp(`^http:GET:.*\/api\/admin\/users\/${req.params.userId}`),
  ),
  usersController.resetAssessmentProgress,
);

module.exports = router;
