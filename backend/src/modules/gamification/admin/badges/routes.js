const express = require("express");
const router = express.Router();
const verifyJWT = require("../../../../middleware/verifyJWT");
const verifyAdminRole = require("../../../../middleware/verifyAdminRole");
const badgesController = require("./controller");

router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin"]));

router.get("/", badgesController.getBadges);
router.get("/:id", badgesController.getBadgeById);
router.post("/", badgesController.createBadge);
router.put("/:id", badgesController.updateBadge);
router.post("/:id/upload-icon", badgesController.uploadBadgeIcon);
router.delete("/:id", badgesController.deleteBadge);
router.put("/reorder/all", badgesController.reorderBadges);

module.exports = router;

