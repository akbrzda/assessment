const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const checkModuleAccess = require("../middleware/checkModuleAccess");
const adminAssessmentController = require("../controllers/adminAssessmentController");
const adminTheoryController = require("../controllers/adminTheoryController");
const { cacheMiddleware, invalidateCacheMiddleware } = require("../middleware/cache");

// Все маршруты требуют JWT и доступ к модулю assessments
router.use(verifyJWT);
router.use(checkModuleAccess("assessments"));

// Получить список аттестаций
router.get("/", cacheMiddleware({ ttl: 120 }), adminAssessmentController.getAssessments);

// Экспорт аттестации в Excel (до /:id чтобы не конфликтовало)
router.get("/:id/export", adminAssessmentController.exportAssessmentToExcel);

// Получить детализацию аттестации
router.get("/:id/details", cacheMiddleware({ ttl: 180 }), adminAssessmentController.getAssessmentDetails);

// Прогресс пользователя по аттестации
router.get("/:id/users/:userId/progress", cacheMiddleware({ ttl: 60 }), adminAssessmentController.getUserAssessmentProgress);

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

// Обновить аттестацию
router.put(
  "/:id",
  invalidateCacheMiddleware((req) => new RegExp(`^http:GET:.*\/api\/admin\/assessments(\/${req.params.id}|\/|\\?)`)),
  adminAssessmentController.updateAssessment
);

// Удалить аттестацию (только pending)
router.delete("/:id", invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/assessments/), adminAssessmentController.deleteAssessment);

module.exports = router;
