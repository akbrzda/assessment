const express = require("express");
const verifyInitData = require("../middleware/verifyInitData");
const resolveUser = require("../middleware/resolveUser");
const requireRole = require("../middleware/requireRole");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

router.use(verifyInitData, resolveUser, requireRole(["manager", "superadmin"]));

router.get("/summary", analyticsController.getSummary);
router.get("/branches", analyticsController.getBranchReport);
router.get("/employees", analyticsController.getEmployeeReport);
router.get("/export", analyticsController.exportReport);

module.exports = router;
