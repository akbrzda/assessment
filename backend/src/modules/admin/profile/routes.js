const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const verifyAdminRole = require("../../../middleware/verifyAdminRole");
const profileController = require("./controller");

const router = express.Router();

router.use(verifyJWT, verifyAdminRole(["superadmin", "manager"]));

router.get("/", profileController.getProfile);
router.put("/", profileController.updateProfile);

module.exports = router;

