const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const { requirePermission } = require("../../../middleware/permission");
const rolesController = require("./controller");

const router = express.Router();

router.use(verifyJWT, checkModuleAccess("users"));

router.get("/", requirePermission("users", "user", "read"), rolesController.list);
router.get("/:id", requirePermission("users", "user", "read"), rolesController.getById);
router.post("/:id/permissions", requirePermission("users", "user", "update"), rolesController.updatePermissions);

module.exports = router;
