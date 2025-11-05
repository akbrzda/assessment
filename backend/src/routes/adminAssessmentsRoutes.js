const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const adminAssessmentController = require("../controllers/adminAssessmentController");

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

// Получить аттестацию по ID с вопросами и результатами
router.get("/:id", adminAssessmentController.getAssessmentById);

// Создать новую аттестацию
router.post("/", adminAssessmentController.createAssessment);

// Обновить аттестацию (только pending)
router.put("/:id", adminAssessmentController.updateAssessment);

// Удалить аттестацию (только pending)
router.delete("/:id", adminAssessmentController.deleteAssessment);

module.exports = router;
