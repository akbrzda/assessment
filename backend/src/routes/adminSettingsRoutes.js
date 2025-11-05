const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const adminSettingsController = require("../controllers/adminSettingsController");

// Все маршруты требуют JWT и роль superadmin
router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin"]));

// Получить все настройки
router.get("/", adminSettingsController.getSettings);

// Получить настройку по ключу
router.get("/:key", adminSettingsController.getSettingByKey);

// Создать новую настройку
router.post("/", adminSettingsController.createSetting);

// Обновить настройку
router.put("/:key", adminSettingsController.updateSetting);

// Удалить настройку
router.delete("/:key", adminSettingsController.deleteSetting);

module.exports = router;
