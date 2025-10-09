const express = require("express");
const adminUserController = require("../controllers/adminUserController");
const branchController = require("../controllers/branchController");
const verifyInitData = require("../middleware/verifyInitData");
const resolveUser = require("../middleware/resolveUser");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

router.use(verifyInitData, resolveUser, requireRole(["superadmin"]));

// Users management
router.get("/users", adminUserController.listUsers);
router.patch("/users/:id", adminUserController.updateUser);
router.delete("/users/:id", adminUserController.deleteUser);

// Branches management
router.get("/branches", branchController.listBranches);
router.post("/branches", branchController.createBranch);
router.patch("/branches/:id", branchController.updateBranch);
router.delete("/branches/:id", branchController.deleteBranch);

module.exports = router;
