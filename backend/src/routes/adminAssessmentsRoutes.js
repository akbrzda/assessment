const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const adminAssessmentController = require("../controllers/adminAssessmentController");
const adminTheoryController = require("../controllers/adminTheoryController");
const { cacheMiddleware, invalidateCacheMiddleware } = require("../middleware/cache");

// Все маршруты требуют JWT и роль manager или superadmin
router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin", "manager"]));

// Получить список аттестаций
router.get("/", cacheMiddleware({ ttl: 120 }), adminAssessmentController.getAssessments);

// Экспорт аттестации в Excel (до /:id чтобы не конфликтовало)
router.get("/:id/export", adminAssessmentController.exportAssessmentToExcel);

// Получить детализацию аттестации
router.get("/:id/details", cacheMiddleware({ ttl: 180 }), adminAssessmentController.getAssessmentDetails);

// Получить результаты аттестации
router.get("/:id/results", cacheMiddleware({ ttl: 60 }), adminAssessmentController.getAssessmentResults);

// Работа с теорией
router.get("/:id/theory", cacheMiddleware({ ttl: 300 }), adminTheoryController.getTheory);
router.put(
  "/:id/theory/draft",
  invalidateCacheMiddleware((req) => new RegExp(`^http:GET:.*\/api\/admin\/assessments\/${req.params.id}\/theory`)),
  adminTheoryController.saveDraft
);
router.post(
  "/:id/theory/publish",
  invalidateCacheMiddleware((req) => new RegExp(`^http:GET:.*\/api\/admin\/assessments\/${req.params.id}`)),
  adminTheoryController.publish
);

// Получить аттестацию по ID с вопросами и результатами
router.get("/:id", cacheMiddleware({ ttl: 180 }), adminAssessmentController.getAssessmentById);

// Создать новую аттестацию
router.post("/", invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/assessments(\/|\\?|$)/), adminAssessmentController.createAssessment);

// Обновить аттестацию (только pending)
router.put(
  "/:id",
  invalidateCacheMiddleware((req) => new RegExp(`^http:GET:.*\/api\/admin\/assessments(\/${req.params.id}|\/|\\?)`)),
  adminAssessmentController.updateAssessment
);

// Удалить аттестацию (только pending)
router.delete("/:id", invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/assessments/), adminAssessmentController.deleteAssessment);

module.exports = router;
