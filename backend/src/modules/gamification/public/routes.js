const express = require("express");
const verifyInitData = require("../../../middleware/verifyInitData");
const resolveUser = require("../../../middleware/resolveUser");
const requireRole = require("../../../middleware/requireRole");
const gamificationController = require("./controller");

const router = express.Router();

router.use(verifyInitData, resolveUser);

router.get(
  "/overview",
  requireRole(["employee", "manager", "superadmin"]),
  gamificationController.getOverview
);
router.get(
  "/badges",
  requireRole(["employee", "manager", "superadmin"]),
  gamificationController.getBadges
);

module.exports = router;

