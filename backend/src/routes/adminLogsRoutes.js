const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const adminLogsController = require("../controllers/adminLogsController");

// Все маршруты требуют JWT и роль superadmin или manager
router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin", "manager"]));

// Получить логи с фильтрами
router.get("/", adminLogsController.getLogs);

// Получить статистику по логам
router.get("/stats", adminLogsController.getLogsStats);

// Получить список типов действий
router.get("/action-types", adminLogsController.getActionTypes);

// Получить список типов сущностей
router.get("/entity-types", adminLogsController.getEntityTypes);

// Экспорт логов в Excel
router.get("/export", adminLogsController.exportLogs);

// Отправить логи в Telegram (только superadmin)
router.post("/send-to-telegram", verifyAdminRole(["superadmin"]), adminLogsController.sendLogsToTelegram);

module.exports = router;
