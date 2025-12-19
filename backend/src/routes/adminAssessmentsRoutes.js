const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const adminAssessmentController = require("../controllers/adminAssessmentController");
const adminTheoryController = require("../controllers/adminTheoryController");

// Все маршруты требуют JWT и роль manager или superadmin
router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin", "manager"]));

// Получить список аттестаций
router.get("/", adminAssessmentController.getAssessments);

// Экспорт аттестации в Excel (до /:id чтобы не конфликтовало)
router.get("/:id/export", adminAssessmentController.exportAssessmentToExcel);

// Получить детализацию аттестации
router.get("/:id/details", adminAssessmentController.getAssessmentDetails);

// Получить результаты аттестации
router.get("/:id/results", adminAssessmentController.getAssessmentResults);

// Работа с теорией
router.get("/:id/theory", adminTheoryController.getTheory);
router.put("/:id/theory/draft", adminTheoryController.saveDraft);
router.post("/:id/theory/publish", adminTheoryController.publish);

// Получить аттестацию по ID с вопросами и результатами
router.get("/:id", adminAssessmentController.getAssessmentById);

// Создать новую аттестацию
router.post("/", adminAssessmentController.createAssessment);

// Обновить аттестацию (только pending)
router.put("/:id", adminAssessmentController.updateAssessment);

// Удалить аттестацию (только pending)
router.delete("/:id", adminAssessmentController.deleteAssessment);

module.exports = router;
