const express = require("express");
const router = express.Router();
const adminAuthController = require("../controllers/adminAuthController");
const verifyJWT = require("../middleware/verifyJWT");

// Авторизация
router.post("/login", adminAuthController.login);

// Обновление токена
router.post("/refresh", adminAuthController.refresh);

// Выход
router.post("/logout", verifyJWT, adminAuthController.logout);

module.exports = router;
