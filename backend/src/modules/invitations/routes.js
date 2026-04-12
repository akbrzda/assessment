const express = require("express");
const verifyInitData = require("../../middleware/verifyInitData");
const resolveUser = require("../../middleware/resolveUser");
const checkModuleAccess = require("../../middleware/checkModuleAccess");
const invitationsController = require("./controller");

const router = express.Router();

router.use(verifyInitData, resolveUser, checkModuleAccess("invitations"));

router.get("/", invitationsController.list);
router.post("/", invitationsController.create);
router.patch("/:id", invitationsController.update);
router.post("/:id/extend", invitationsController.extend);
router.delete("/:id", invitationsController.remove);

module.exports = router;
