const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const invitationsController = require("./invitations.controller");

const router = express.Router();

router.use(verifyJWT, checkModuleAccess("invitations"));

router.get("/", invitationsController.listInvitations);
router.post("/", invitationsController.createInvitation);
router.patch("/:id", invitationsController.updateInvitation);
router.post("/:id/extend", invitationsController.extendInvitation);
router.delete("/:id", invitationsController.deleteInvitation);

module.exports = router;
