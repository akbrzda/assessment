const express = require("express");
const router = express.Router();
const adminDashboardController = require("../controllers/adminDashboardController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");

// Получить метрики Dashboard
router.get("/metrics", verifyJWT, verifyAdminRole(["superadmin", "manager"]), adminDashboardController.getMetrics);

// Получить динамику активности
router.get("/activity-trends", verifyJWT, verifyAdminRole(["superadmin", "manager"]), adminDashboardController.getActivityTrends);

// Получить KPI по филиалам
router.get("/branch-kpi", verifyJWT, verifyAdminRole(["superadmin", "manager"]), adminDashboardController.getBranchKPI);

// Получить последние действия
router.get("/recent-actions", verifyJWT, verifyAdminRole(["superadmin", "manager"]), adminDashboardController.getRecentActions);

// Получить последние попытки аттестаций
router.get(
  "/latest-assessment-activities",
  verifyJWT,
  verifyAdminRole(["superadmin", "manager"]),
  adminDashboardController.getLatestAssessmentActivities
);

module.exports = router;
