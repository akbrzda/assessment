const express = require("express");
const router = express.Router();
const adminPermissionsController = require("../controllers/adminPermissionsController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");

// Все маршруты требуют авторизации
router.use(verifyJWT);

// Получить список всех модулей системы (только superadmin)
router.get("/modules", verifyAdminRole(["superadmin"]), adminPermissionsController.getSystemModules);

// Получить права доступа пользователя (superadmin или сам пользователь)
router.get("/users/:userId", adminPermissionsController.getUserPermissions);

// Обновить права доступа пользователя (только superadmin)
router.put("/users/:userId", verifyAdminRole(["superadmin"]), adminPermissionsController.updateUserPermissions);

// Проверить доступ пользователя к модулю (superadmin или сам пользователь)
router.get("/users/:userId/check", adminPermissionsController.checkUserAccess);

module.exports = router;
