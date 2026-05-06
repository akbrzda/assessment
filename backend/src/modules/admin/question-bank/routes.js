const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const { requirePermission } = require("../../../middleware/permission");
const questionBankController = require("./controller");

const router = express.Router();

// Все маршруты требуют JWT и доступ к модулю questions
router.use(verifyJWT);
router.use(checkModuleAccess("questions"));

router.get("/categories", questionBankController.getCategories);
router.post("/categories", requirePermission("questions", "question", "create"), questionBankController.createCategory);
router.put("/categories/:id", requirePermission("questions", "question", "update"), questionBankController.updateCategory);
router.patch("/categories/:id", requirePermission("questions", "question", "update"), questionBankController.updateCategory);
router.delete("/categories/:id", requirePermission("questions", "question", "delete"), questionBankController.deleteCategory);

router.get("/", requirePermission("questions", "question", "read"), questionBankController.getQuestions);
router.get("/:id", questionBankController.getQuestionById);
router.post("/", requirePermission("questions", "question", "create"), questionBankController.createQuestion);
router.put("/:id", requirePermission("questions", "question", "update"), questionBankController.updateQuestion);
router.patch("/:id", requirePermission("questions", "question", "update"), questionBankController.updateQuestion);
router.delete("/:id", requirePermission("questions", "question", "delete"), questionBankController.deleteQuestion);

module.exports = router;

