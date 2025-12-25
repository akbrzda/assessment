const express = require("express");
const router = express.Router();
const adminDashboardController = require("../controllers/adminDashboardController");
const verifyJWT = require("../middleware/verifyJWT");
const checkModuleAccess = require("../middleware/checkModuleAccess");

// Все маршруты требуют JWT и доступ к аналитике (дашборд - это часть аналитики)
router.use(verifyJWT, checkModuleAccess("analytics"));

// Получить метрики Dashboard
router.get("/metrics", adminDashboardController.getMetrics);

// Получить динамику активности
router.get("/activity-trends", adminDashboardController.getActivityTrends);

// Получить KPI по филиалам
router.get("/branch-kpi", adminDashboardController.getBranchKPI);

// Получить последние попытки аттестаций
router.get("/latest-assessment-activities", adminDashboardController.getLatestAssessmentActivities);

module.exports = router;
