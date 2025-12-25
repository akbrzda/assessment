const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const checkModuleAccess = require("../middleware/checkModuleAccess");
const adminRules = require("../controllers/adminGamificationRulesController");
const rulesDryRun = require("../controllers/gamificationRulesController");

router.use(verifyJWT);
router.use(checkModuleAccess("gamification"));

router.get("/", adminRules.list);
router.get("/:id", adminRules.getById);
router.post("/", adminRules.create);
router.put("/:id", adminRules.update);
router.delete("/:id", adminRules.remove);

router.post("/dry-run", rulesDryRun.dryRun);

module.exports = router;
