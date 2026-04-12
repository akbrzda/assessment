const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const {
  cacheMiddleware,
  invalidateCacheMiddleware,
} = require("../../../middleware/cache");
const assessmentsController = require("./controller");
const theoryController = require("./theory/assessments-theory.controller");

const router = express.Router();

router.use(verifyJWT);
router.use(checkModuleAccess("assessments"));

router.get("/", cacheMiddleware({ ttl: 120 }), assessmentsController.getAssessments);
router.get("/:id/export", assessmentsController.exportAssessmentToExcel);
router.get("/:id/details", cacheMiddleware({ ttl: 180 }), assessmentsController.getAssessmentDetails);
router.get(
  "/:id/users/:userId/progress",
  cacheMiddleware({ ttl: 60 }),
  assessmentsController.getUserAssessmentProgress,
);
router.get("/:id/results", cacheMiddleware({ ttl: 60 }), assessmentsController.getAssessmentResults);
router.get("/:id/theory", cacheMiddleware({ ttl: 300 }), theoryController.getTheory);
router.put(
  "/:id/theory/draft",
  invalidateCacheMiddleware(
    (req) => new RegExp(`^http:GET:.*\/api\/admin\/assessments\/${req.params.id}\/theory`),
  ),
  theoryController.saveDraft,
);
router.post(
  "/:id/theory/publish",
  invalidateCacheMiddleware(
    (req) => new RegExp(`^http:GET:.*\/api\/admin\/assessments\/${req.params.id}`),
  ),
  theoryController.publish,
);
router.get("/:id", cacheMiddleware({ ttl: 180 }), assessmentsController.getAssessmentById);
router.post(
  "/",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/assessments(\/|\\?|$)/),
  assessmentsController.createAssessment,
);
router.put(
  "/:id",
  invalidateCacheMiddleware(
    (req) => new RegExp(`^http:GET:.*\/api\/admin\/assessments(\/${req.params.id}|\/|\\?)`),
  ),
  assessmentsController.updateAssessment,
);
router.delete(
  "/:id",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/assessments/),
  assessmentsController.deleteAssessment,
);

module.exports = router;
