const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const dashboardController = require("./dashboard.controller");

const router = express.Router();

// Все маршруты требуют JWT и доступ к аналитике (дашборд - это часть аналитики)
router.use(verifyJWT, checkModuleAccess("analytics"));

router.get("/metrics", dashboardController.getMetrics);
router.get("/activity-trends", dashboardController.getActivityTrends);
router.get("/branch-kpi", dashboardController.getBranchKPI);
router.get(
  "/latest-assessment-activities",
  dashboardController.getLatestAssessmentActivities,
);

module.exports = router;
