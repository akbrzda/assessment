const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const checkModuleAccess = require("../middleware/checkModuleAccess");
const adminSettingsController = require("../controllers/adminSettingsController");

// Все маршруты требуют JWT и доступ к модулю settings
router.use(verifyJWT);
router.use(checkModuleAccess("settings"));

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
