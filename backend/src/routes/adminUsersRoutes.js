const express = require("express");
const router = express.Router();
const adminUserController = require("../controllers/adminUserController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const checkModuleAccess = require("../middleware/checkModuleAccess");
const canEditUser = require("../middleware/canEditUser");
const { cacheMiddleware, invalidateCacheMiddleware } = require("../middleware/cache");

// Все маршруты защищены JWT и доступны через проверку модуля users
router.use(verifyJWT, checkModuleAccess("users"));

// Получить список пользователей с фильтрами
router.get("/", cacheMiddleware({ ttl: 60 }), adminUserController.listUsers);

// Экспорт пользователей в Excel
router.get("/export/excel", adminUserController.exportUsersToExcel);

// Получить детальную статистику пользователя
router.get("/:id/stats", cacheMiddleware({ ttl: 120 }), adminUserController.getUserDetailedStats);

// Получить пользователя по ID
router.get("/:id", cacheMiddleware({ ttl: 120 }), adminUserController.getUserById);

// Создать нового пользователя (только superadmin)
router.post("/", verifyAdminRole(["superadmin"]), invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/users/), adminUserController.createUser);

// Обновить пользователя
router.patch(
  "/:id",
  canEditUser,
  invalidateCacheMiddleware((req) => new RegExp(`^http:GET:.*\/api\/admin\/users(\/|\\?|$)`)),
  adminUserController.updateUser
);

// Удалить пользователя (только superadmin)
router.delete("/:id", verifyAdminRole(["superadmin"]), invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/users/), adminUserController.deleteUser);

// Сбросить пароль пользователя (доступ через модуль users)
router.post("/:id/reset-password", adminUserController.resetPassword);

// Сбросить прогресс аттестации для пользователя
router.delete(
  "/:userId/assessments/:assessmentId/progress",
  invalidateCacheMiddleware((req) => new RegExp(`^http:GET:.*\/api\/admin\/users\/${req.params.userId}`)),
  adminUserController.resetAssessmentProgress
);

module.exports = router;
