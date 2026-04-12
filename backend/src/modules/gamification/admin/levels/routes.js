const express = require("express");
const router = express.Router();
const verifyJWT = require("../../../../middleware/verifyJWT");
const verifyAdminRole = require("../../../../middleware/verifyAdminRole");
const levelsController = require("./controller");

router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin"]));

router.get("/", levelsController.getLevels);
router.get("/stats", levelsController.getLevelsStats);
router.get("/:level_number", levelsController.getLevelByNumber);
router.post("/", levelsController.createLevel);
router.put("/:level_number", levelsController.updateLevel);
router.delete("/:level_number", levelsController.deleteLevel);
router.post("/recalculate/all", levelsController.recalculateLevels);

module.exports = router;

