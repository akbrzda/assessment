const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const { cacheMiddleware } = require("../../../middleware/cache");
const assessmentsController = require("./assessments.controller");

const router = express.Router();

router.use(verifyJWT);
router.use(checkModuleAccess("assessments"));

router.get("/", cacheMiddleware({ ttl: 120 }), assessmentsController.getAssessments);
router.get("/:id", cacheMiddleware({ ttl: 180 }), assessmentsController.getAssessmentById);

module.exports = router;
