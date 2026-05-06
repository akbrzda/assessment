const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const { requirePermission } = require("../../../middleware/permission");
const AssessmentPolicy = require("../../../policies/AssessmentPolicy");
const { pool } = require("../../../config/database");
const {
  cacheMiddleware,
  invalidateCacheMiddleware,
} = require("../../../middleware/cache");
const assessmentsController = require("./controller");
const theoryController = require("./theory/controller");

const router = express.Router();

router.use(verifyJWT);
router.use(checkModuleAccess("assessments"));

async function ensureAssessmentProgressPolicy(req, res, next) {
  try {
    const targetUserId = Number(req.params.userId);
    if (!targetUserId || targetUserId <= 0) {
      return res.status(400).json({ error: "Некорректный идентификатор пользователя" });
    }

    const [rows] = await pool.query("SELECT id, branch_id FROM users WHERE id = ? LIMIT 1", [targetUserId]);
    if (!rows.length) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    if (!AssessmentPolicy.viewProgress(req.user, rows[0])) {
      return res.status(403).json({ error: "Доступ запрещен" });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

router.get("/", requirePermission("assessments", "assessment", "read"), cacheMiddleware({ ttl: 120 }), assessmentsController.getAssessments);
router.get("/:id/export", assessmentsController.exportAssessmentToExcel);
router.get("/:id/details", cacheMiddleware({ ttl: 180 }), assessmentsController.getAssessmentDetails);
router.get(
  "/:id/users/:userId/progress",
  requirePermission("assessments", "assessment", "read", {
    contextBuilder: (req) => ({
      assessmentId: Number(req.params.id),
      targetUserId: Number(req.params.userId),
    }),
  }),
  ensureAssessmentProgressPolicy,
  cacheMiddleware({ ttl: 60 }),
  assessmentsController.getUserAssessmentProgress,
);
router.get("/:id/results", cacheMiddleware({ ttl: 60 }), assessmentsController.getAssessmentResults);
router.get("/:id/theory", cacheMiddleware({ ttl: 300 }), theoryController.getTheory);
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
  requirePermission("assessments", "assessment", "create"),
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/assessments(\/|\\?|$)/),
  assessmentsController.createAssessment,
);
router.patch(
  "/:id",
  requirePermission("assessments", "assessment", "update"),
  invalidateCacheMiddleware(
    (req) => new RegExp(`^http:GET:.*\/api\/admin\/assessments(\/${req.params.id}|\/|\\?)`),
  ),
  assessmentsController.updateAssessment,
);
router.put(
  "/:id",
  requirePermission("assessments", "assessment", "update"),
  invalidateCacheMiddleware(
    (req) => new RegExp(`^http:GET:.*\/api\/admin\/assessments(\/${req.params.id}|\/|\\?)`),
  ),
  assessmentsController.updateAssessment,
);
router.delete(
  "/:id",
  requirePermission("assessments", "assessment", "delete"),
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/assessments/),
  assessmentsController.deleteAssessment,
);

module.exports = router;
