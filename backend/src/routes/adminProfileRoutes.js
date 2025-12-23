const express = require("express");
const router = express.Router();
const adminProfileController = require("../controllers/adminProfileController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");

// Все маршруты защищены JWT и доступны всем авторизованным админам
router.use(verifyJWT, verifyAdminRole(["superadmin", "manager"]));

// Получить профиль текущего пользователя
router.get("/", adminProfileController.getProfile);

// Обновить профиль текущего пользователя
router.put("/", adminProfileController.updateProfile);

module.exports = router;
