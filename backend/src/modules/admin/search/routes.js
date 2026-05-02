const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const controller = require("./controller");

const router = express.Router();

router.use(verifyJWT);
router.get("/", controller.globalSearch);

module.exports = router;
