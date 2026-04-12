const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const authController = require("./auth.controller");

const router = express.Router();

router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", verifyJWT, authController.logout);

module.exports = router;
