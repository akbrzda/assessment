const express = require("express");
const router = express.Router();
const verifyJWT = require("../../../middleware/verifyJWT");
const verifyAdminRole = require("../../../middleware/verifyAdminRole");
const permissionsController = require("./controller");

router.use(verifyJWT);

router.get("/modules", verifyAdminRole(["superadmin"]), permissionsController.getSystemModules);
router.get("/default-modules", verifyAdminRole(["superadmin", "manager"]), permissionsController.getDefaultModules);
router.get("/users/:userId", permissionsController.getUserPermissions);
router.put("/users/:userId", verifyAdminRole(["superadmin"]), permissionsController.updateUserPermissions);
router.get("/users/:userId/check", permissionsController.checkUserAccess);

module.exports = router;
