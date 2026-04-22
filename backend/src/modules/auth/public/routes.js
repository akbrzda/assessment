const express = require("express");
const verifyInitData = require("../../../middleware/verifyInitData");
const resolveUser = require("../../../middleware/resolveUser");
const authController = require("./controller");

const router = express.Router();

router.post("/status", verifyInitData, resolveUser, authController.getStatus);
router.post("/register", verifyInitData, resolveUser, authController.register);
router.get("/profile", verifyInitData, resolveUser, authController.getProfile);
router.patch("/profile", verifyInitData, resolveUser, authController.updateProfile);
router.patch("/timezone", verifyInitData, resolveUser, authController.updateTimezone);
router.post("/onboarding/complete", verifyInitData, resolveUser, authController.completeOnboarding);
router.get("/references", verifyInitData, authController.getReferences);

module.exports = router;
