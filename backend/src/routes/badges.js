const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const badgesController = require("../controllers/badgesController");

// Все маршруты требуют JWT и роль superadmin
router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin"]));

// Получить все бейджи
router.get("/", badgesController.getBadges);

// Получить бейдж по ID
router.get("/:id", badgesController.getBadgeById);

// Создать новый бейдж
router.post("/", badgesController.createBadge);

// Обновить бейдж
router.put("/:id", badgesController.updateBadge);

// Загрузить иконку для бейджа
router.post("/:id/upload-icon", badgesController.uploadBadgeIcon);

// Удалить бейдж
router.delete("/:id", badgesController.deleteBadge);

// Изменить порядок бейджей
router.put("/reorder/all", badgesController.reorderBadges);

module.exports = router;
