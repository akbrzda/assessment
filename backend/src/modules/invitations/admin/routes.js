const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const { requirePermission } = require("../../../middleware/permission");
const invitationsController = require("./controller");

const router = express.Router();

router.use(verifyJWT, checkModuleAccess("invitations"));

router.get("/", requirePermission("invitations", "invitation", "read"), invitationsController.listInvitations);
router.post("/", requirePermission("invitations", "invitation", "create"), invitationsController.createInvitation);
router.post("/send", requirePermission("invitations", "invitation", "create"), invitationsController.createInvitation);
router.patch("/:id", requirePermission("invitations", "invitation", "update"), invitationsController.updateInvitation);
router.post("/:id/extend", invitationsController.extendInvitation);
router.delete("/:id", requirePermission("invitations", "invitation", "delete"), invitationsController.deleteInvitation);

module.exports = router;

