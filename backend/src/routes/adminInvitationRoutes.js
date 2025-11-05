const express = require("express");
const adminInvitationController = require("../controllers/adminInvitationController");
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");

const router = express.Router();

// Все маршруты защищены JWT и доступны superadmin и manager
router.use(verifyJWT, verifyAdminRole(["superadmin", "manager"]));

router.get("/", adminInvitationController.listInvitations);
router.post("/", adminInvitationController.createInvitation);
router.patch("/:id", adminInvitationController.updateInvitation);
router.post("/:id/extend", adminInvitationController.extendInvitation);
router.delete("/:id", adminInvitationController.deleteInvitation);

module.exports = router;
