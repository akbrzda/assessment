const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const controller = require("./controller");

const router = express.Router();

router.use(verifyJWT, checkModuleAccess("analytics"));
router.get("/", controller.globalSearch);

module.exports = router;
