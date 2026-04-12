const express = require("express");
const verifyInitData = require("../../../middleware/verifyInitData");
const resolveUser = require("../../../middleware/resolveUser");
const requireRole = require("../../../middleware/requireRole");
const legacyController = require("./legacy.controller");

const router = express.Router();

router.use(verifyInitData, resolveUser, requireRole(["superadmin"]));

router.get("/references", legacyController.getAdminReferences);
router.get("/users", legacyController.listUsers);
router.patch("/users/:id", legacyController.updateUser);
router.delete("/users/:id", legacyController.deleteUser);
router.get("/branches", legacyController.listBranches);
router.post("/branches", legacyController.createBranch);
router.patch("/branches/:id", legacyController.updateBranch);
router.delete("/branches/:id", legacyController.deleteBranch);

module.exports = router;
