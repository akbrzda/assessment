const express = require("express");
const rateLimit = require("express-rate-limit");
const verifyJWT = require("../../../middleware/verifyJWT");
const authController = require("./controller");

const router = express.Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много попыток входа. Попробуйте позже." },
});

router.post("/login", loginRateLimiter, authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", verifyJWT, authController.logout);

module.exports = router;

