const express = require("express");
const adminUserController = require("../controllers/adminUserController");
const branchController = require("../controllers/branchController");
const authController = require("../controllers/authController");
const verifyInitData = require("../middleware/verifyInitData");
const resolveUser = require("../middleware/resolveUser");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

router.use(verifyInitData, resolveUser, requireRole(["superadmin"]));

// References for admin (includes all positions)
router.get("/references", authController.getAdminReferences);

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
