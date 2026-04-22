const express = require("express");
const router = express.Router();
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const analyticsController = require("./controller");

router.use(verifyJWT);
router.use(checkModuleAccess("analytics"));

router.get("/overall", analyticsController.getOverallStats);
router.get("/branches", analyticsController.getBranchAnalytics);
router.get("/positions", analyticsController.getPositionAnalytics);
router.get("/top-users", analyticsController.getTopUsers);
router.get("/trends", analyticsController.getAssessmentTrends);
router.get("/branches/detailed", analyticsController.getDetailedBranchAnalytics);
router.get("/combined", analyticsController.getCombinedAnalytics);
router.get("/assessment/:assessmentId", analyticsController.getAssessmentReport);
router.get("/user/:userId", analyticsController.getUserReport);
router.get("/export/excel", analyticsController.exportToExcel);
router.get("/export/pdf", analyticsController.exportToPDF);

module.exports = router;

