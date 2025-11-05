const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const levelsController = require("../controllers/levelsController");

// Все маршруты требуют JWT и роль superadmin
router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin"]));

// Получить все уровни
router.get("/", levelsController.getLevels);

// Получить статистику по уровням
router.get("/stats", levelsController.getLevelsStats);

// Получить уровень по номеру
router.get("/:level_number", levelsController.getLevelByNumber);

// Создать новый уровень
router.post("/", levelsController.createLevel);

// Обновить уровень
router.put("/:level_number", levelsController.updateLevel);

// Удалить уровень
router.delete("/:level_number", levelsController.deleteLevel);

// Пересчитать уровни всех пользователей
router.post("/recalculate/all", levelsController.recalculateLevels);

module.exports = router;
