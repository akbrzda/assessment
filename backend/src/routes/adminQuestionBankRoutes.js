const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const checkModuleAccess = require("../middleware/checkModuleAccess");
const adminQuestionBankController = require("../controllers/adminQuestionBankController");

// Все маршруты требуют JWT и доступ к модулю questions
router.use(verifyJWT);
router.use(checkModuleAccess("questions"));

// Категории
router.get("/categories", adminQuestionBankController.getCategories);
router.post("/categories", adminQuestionBankController.createCategory);
router.put("/categories/:id", adminQuestionBankController.updateCategory);
router.delete("/categories/:id", adminQuestionBankController.deleteCategory);

// Вопросы
router.get("/", adminQuestionBankController.getQuestions);
router.get("/:id", adminQuestionBankController.getQuestionById);
router.post("/", adminQuestionBankController.createQuestion);
router.put("/:id", adminQuestionBankController.updateQuestion);
router.delete("/:id", adminQuestionBankController.deleteQuestion);

module.exports = router;
