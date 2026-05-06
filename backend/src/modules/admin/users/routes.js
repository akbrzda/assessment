const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const verifyAdminRole = require("../../../middleware/verifyAdminRole");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const canEditUser = require("../../../middleware/canEditUser");
const { requirePermission } = require("../../../middleware/permission");
const UserPolicy = require("../../../policies/UserPolicy");
const { pool } = require("../../../config/database");
const {
  cacheMiddleware,
  invalidateCacheMiddleware,
} = require("../../../middleware/cache");
const usersController = require("./controller");

const router = express.Router();

// Все маршруты защищены JWT и доступны через проверку модуля users
router.use(verifyJWT, checkModuleAccess("users"));

async function loadUserForPolicy(req, res, next) {
  try {
    const targetUserId = Number(req.params.id);
    if (!targetUserId || targetUserId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор пользователя" });
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.branch_id, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?
       LIMIT 1`,
      [targetUserId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    req.targetUserForPolicy = rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

function ensureUserUpdatePolicy(req, res, next) {
  if (!UserPolicy.update(req.user, req.targetUserForPolicy)) {
    return res.status(403).json({ error: "Доступ запрещен" });
  }
  return next();
}

function ensureUserDeletePolicy(req, res, next) {
  if (!UserPolicy.delete(req.user, req.targetUserForPolicy)) {
    return res.status(403).json({ error: "Доступ запрещен" });
  }
  return next();
}

router.get("/", requirePermission("users", "user", "list"), cacheMiddleware({ ttl: 60 }), usersController.listUsers);
router.get("/login-history", cacheMiddleware({ ttl: 30 }), usersController.getUserLoginHistory);
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
router.get("/:id/courses", cacheMiddleware({ ttl: 120 }), usersController.getUserCourses);
router.get("/:id/permissions", requirePermission("users", "user", "read"), usersController.getPermissions);
router.post(
  "/:id/permissions/override",
  requirePermission("users", "user", "update"),
  usersController.setPermissionOverride,
);
router.delete(
  "/:id/permissions/override/:overrideId",
  requirePermission("users", "user", "update"),
  usersController.deletePermissionOverride,
);
router.post("/:id/roles", requirePermission("users", "user", "update"), usersController.addUserRole);
router.delete("/:id/roles/:roleId", requirePermission("users", "user", "update"), usersController.removeUserRole);
router.get("/:id", requirePermission("users", "user", "read"), cacheMiddleware({ ttl: 120 }), usersController.getUserById);
router.post(
  "/",
  requirePermission("users", "user", "create"),
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/users/),
  usersController.createUser,
);
router.patch(
  "/:id",
  requirePermission("users", "user", "update"),
  loadUserForPolicy,
  ensureUserUpdatePolicy,
  canEditUser,
  invalidateCacheMiddleware(
    (req) => new RegExp(`^http:GET:.*\/api\/admin\/(users|assessments)(\/|\\?|$)`),
  ),
  usersController.updateUser,
);
router.delete(
  "/:id",
  requirePermission("users", "user", "delete"),
  loadUserForPolicy,
  ensureUserDeletePolicy,
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/users/),
  usersController.deleteUser,
);
router.post("/:id/reset-password", canEditUser, usersController.resetPassword);
router.delete(
  "/:userId/assessments/:assessmentId/progress",
  verifyAdminRole(["superadmin"]),
  invalidateCacheMiddleware(
    (req) => new RegExp(`^http:GET:.*\/api\/admin\/users\/${req.params.userId}`),
  ),
  usersController.resetAssessmentProgress,
);

module.exports = router;
