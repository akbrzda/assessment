const express = require("express");
const verifyInitData = require("../../../middleware/verifyInitData");
const resolveUser = require("../../../middleware/resolveUser");
const requireRole = require("../../../middleware/requireRole");
const { cacheMiddleware } = require("../../../middleware/cache");
const assessmentController = require("./controller");

const router = express.Router();

router.use(verifyInitData, resolveUser);

router.get(
  "/user",
  requireRole(["employee", "manager", "superadmin"]),
  cacheMiddleware({
    ttl: 60,
    keyGenerator: (req) => `http:${req.method}:${req.originalUrl}:user:${req.currentUser?.id || "anon"}`,
  }),
  assessmentController.listForUser,
);
router.get("/user/attempts", requireRole(["employee", "manager", "superadmin"]), assessmentController.getUserAttemptHistory);
router.get(
  "/user/:id",
  requireRole(["employee", "manager", "superadmin"]),
  cacheMiddleware({
    ttl: 60,
    keyGenerator: (req) => `http:${req.method}:${req.originalUrl}:user:${req.currentUser?.id || "anon"}`,
  }),
  assessmentController.getForUser,
);
router.get("/:id/theory", requireRole(["employee", "manager", "superadmin"]), assessmentController.getTheory);
router.post("/:id/theory/completion", requireRole(["employee", "manager", "superadmin"]), assessmentController.completeTheory);
router.post("/:id/attempts", requireRole(["employee", "manager", "superadmin"]), assessmentController.startAttempt);
router.post("/:id/attempts/:attemptId/answers", requireRole(["employee", "manager", "superadmin"]), assessmentController.submitAnswer);
router.post("/:id/attempts/:attemptId/answers/batch", requireRole(["employee", "manager", "superadmin"]), assessmentController.submitAnswersBatch);
router.post("/:id/attempts/:attemptId/complete", requireRole(["employee", "manager", "superadmin"]), assessmentController.completeAttempt);
router.get("/:id/attempts/:attemptId", requireRole(["employee", "manager", "superadmin"]), assessmentController.getAttemptResult);

router.get("/admin", requireRole(["superadmin", "manager"]), assessmentController.listManaged);
router.get("/admin/targets", requireRole(["superadmin", "manager"]), assessmentController.listTargets);
router.post("/admin", requireRole(["superadmin", "manager"]), assessmentController.create);
router.get("/admin/:id/theory", requireRole(["superadmin", "manager"]), assessmentController.getAdminTheory);
router.post("/admin/:id/theory/publish", requireRole(["superadmin", "manager"]), assessmentController.publishAdminTheory);
router.get("/admin/:id", requireRole(["superadmin", "manager"]), assessmentController.getDetail);
router.patch("/admin/:id", requireRole(["superadmin", "manager"]), assessmentController.update);
router.delete("/admin/:id", requireRole(["superadmin", "manager"]), assessmentController.remove);

module.exports = router;
