const express = require("express");
const router = express.Router();
const verifyJWT = require("../../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../../middleware/checkModuleAccess");
const rulesController = require("./controller");

router.use(verifyJWT);
router.use(checkModuleAccess("gamification"));

router.get("/", rulesController.list);
router.get("/:id", rulesController.getById);
router.post("/", rulesController.create);
router.put("/:id", rulesController.update);
router.delete("/:id", rulesController.remove);
router.post("/dry-run", rulesController.dryRun);

module.exports = router;

