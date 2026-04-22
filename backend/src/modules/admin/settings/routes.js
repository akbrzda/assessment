const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const settingsController = require("./controller");

const router = express.Router();

router.use(verifyJWT);
router.use(checkModuleAccess("settings"));

router.get("/", settingsController.getSettings);
router.get("/:key", settingsController.getSettingByKey);
router.post("/", settingsController.createSetting);
router.put("/:key", settingsController.updateSetting);
router.delete("/:key", settingsController.deleteSetting);

module.exports = router;

