const express = require("express");
const adminInvitationController = require("../controllers/adminInvitationController");
const verifyJWT = require("../middleware/verifyJWT");
const checkModuleAccess = require("../middleware/checkModuleAccess");

const router = express.Router();

// Все маршруты защищены JWT и доступны через модуль invitations
router.use(verifyJWT, checkModuleAccess("invitations"));

router.get("/", adminInvitationController.listInvitations);
router.post("/", adminInvitationController.createInvitation);
router.patch("/:id", adminInvitationController.updateInvitation);
router.post("/:id/extend", adminInvitationController.extendInvitation);
router.delete("/:id", adminInvitationController.deleteInvitation);

module.exports = router;
