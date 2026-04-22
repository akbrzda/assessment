const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const questionBankController = require("./controller");

const router = express.Router();

// Р’СЃРµ РјР°СЂС€СЂСѓС‚С‹ С‚СЂРµР±СѓСЋС‚ JWT Рё РґРѕСЃС‚СѓРї Рє РјРѕРґСѓР»СЋ questions
router.use(verifyJWT);
router.use(checkModuleAccess("questions"));

router.get("/categories", questionBankController.getCategories);
router.post("/categories", questionBankController.createCategory);
router.put("/categories/:id", questionBankController.updateCategory);
router.delete("/categories/:id", questionBankController.deleteCategory);

router.get("/", questionBankController.getQuestions);
router.get("/:id", questionBankController.getQuestionById);
router.post("/", questionBankController.createQuestion);
router.put("/:id", questionBankController.updateQuestion);
router.delete("/:id", questionBankController.deleteQuestion);

module.exports = router;

