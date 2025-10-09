const express = require("express");
const invitationController = require("../controllers/invitationController");
const verifyInitData = require("../middleware/verifyInitData");
const resolveUser = require("../middleware/resolveUser");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

router.use(verifyInitData, resolveUser, requireRole(["superadmin"]));

router.get("/", invitationController.list);
router.post("/", invitationController.create);
router.patch("/:id", invitationController.update);
router.post("/:id/extend", invitationController.extend);
router.delete("/:id", invitationController.remove);

module.exports = router;
