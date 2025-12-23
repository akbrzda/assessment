const express = require("express");
const router = express.Router();
const adminUserController = require("../controllers/adminUserController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const { cacheMiddleware, invalidateCacheMiddleware } = require("../middleware/cache");

// Все маршруты защищены JWT и доступны superadmin и manager
router.use(verifyJWT, verifyAdminRole(["superadmin", "manager"]));

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
  invalidateCacheMiddleware((req) => new RegExp(`^http:GET:.*\/api\/admin\/users(\/|\\?|$)`)),
  adminUserController.updateUser
);

// Удалить пользователя (только superadmin)
router.delete("/:id", verifyAdminRole(["superadmin"]), invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/users/), adminUserController.deleteUser);

// Сбросить пароль пользователя
router.post("/:id/reset-password", adminUserController.resetPassword);

module.exports = router;
