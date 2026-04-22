const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const dashboardController = require("./controller");

const router = express.Router();

// Р’СЃРµ РјР°СЂС€СЂСѓС‚С‹ С‚СЂРµР±СѓСЋС‚ JWT Рё РґРѕСЃС‚СѓРї Рє Р°РЅР°Р»РёС‚РёРєРµ (РґР°С€Р±РѕСЂРґ - СЌС‚Рѕ С‡Р°СЃС‚СЊ Р°РЅР°Р»РёС‚РёРєРё)
router.use(verifyJWT, checkModuleAccess("analytics"));

router.get("/metrics", dashboardController.getMetrics);
router.get("/activity-trends", dashboardController.getActivityTrends);
router.get("/branch-kpi", dashboardController.getBranchKPI);
router.get(
  "/latest-assessment-activities",
  dashboardController.getLatestAssessmentActivities,
);

module.exports = router;

