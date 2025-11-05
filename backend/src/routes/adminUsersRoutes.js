const express = require("express");
const router = express.Router();
const adminUserController = require("../controllers/adminUserController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");

// Все маршруты защищены JWT и доступны superadmin и manager
router.use(verifyJWT, verifyAdminRole(["superadmin", "manager"]));

// Получить список пользователей с фильтрами
router.get("/", adminUserController.listUsers);

// Экспорт пользователей в Excel
router.get("/export/excel", adminUserController.exportUsersToExcel);

// Получить детальную статистику пользователя
router.get("/:id/stats", adminUserController.getUserDetailedStats);

// Получить пользователя по ID
router.get("/:id", adminUserController.getUserById);

// Создать нового пользователя (только superadmin)
router.post("/", verifyAdminRole(["superadmin"]), adminUserController.createUser);

// Обновить пользователя
router.patch("/:id", adminUserController.updateUser);

// Удалить пользователя (только superadmin)
router.delete("/:id", verifyAdminRole(["superadmin"]), adminUserController.deleteUser);

// Сбросить пароль пользователя
router.post("/:id/reset-password", adminUserController.resetPassword);

module.exports = router;
