const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const adminPositionController = require("../controllers/adminPositionController");

router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin"]));

router.get("/", adminPositionController.getPositions);
router.get("/:id", adminPositionController.getPositionById);
router.post("/", adminPositionController.createPosition);
router.put("/:id", adminPositionController.updatePosition);
router.delete("/:id", adminPositionController.deletePosition);

module.exports = router;
