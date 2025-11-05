const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const adminAnalyticsController = require("../controllers/adminAnalyticsController");

// Все маршруты требуют JWT и роль manager или superadmin
router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin", "manager"]));

// Получить общую статистику
router.get("/overall", adminAnalyticsController.getOverallStats);

// Аналитика по филиалам
router.get("/branches", adminAnalyticsController.getBranchAnalytics);

// Аналитика по должностям
router.get("/positions", adminAnalyticsController.getPositionAnalytics);

// Топ сотрудников
router.get("/top-users", adminAnalyticsController.getTopUsers);

// Динамика по датам
router.get("/trends", adminAnalyticsController.getAssessmentTrends);

// Детальная аналитика по филиалам
router.get("/branches/detailed", adminAnalyticsController.getDetailedBranchAnalytics);

// Комбинированная аналитика (филиалы + должности)
router.get("/combined", adminAnalyticsController.getCombinedAnalytics);

// Отчёт по конкретной аттестации
router.get("/assessment/:assessmentId", adminAnalyticsController.getAssessmentReport);

// Отчёт по конкретному пользователю
router.get("/user/:userId", adminAnalyticsController.getUserReport);

// Экспорт в Excel
router.get("/export/excel", adminAnalyticsController.exportToExcel);

// Экспорт в PDF
router.get("/export/pdf", adminAnalyticsController.exportToPDF);

module.exports = router;
