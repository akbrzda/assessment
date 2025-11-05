const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const adminBranchController = require("../controllers/adminBranchController");

// Все маршруты требуют JWT и роль superadmin
router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin"]));

// Получить список управляющих (должен быть ДО /:id)
router.get("/managers/list", adminBranchController.getManagers);

// Массовое назначение управляющего к филиалам (должен быть ДО /:id)
router.post("/managers/assign-multiple", adminBranchController.assignManagerToBranches);

// Получить список филиалов
router.get("/", adminBranchController.getBranches);

// Получить филиал по ID
router.get("/:id", adminBranchController.getBranchById);

// Создать новый филиал
router.post("/", adminBranchController.createBranch);

// Обновить филиал
router.put("/:id", adminBranchController.updateBranch);

// Удалить филиал
router.delete("/:id", adminBranchController.deleteBranch);

// Назначить управляющего к филиалу
router.post("/:id/managers", adminBranchController.assignManager);

// Удалить управляющего из филиала
router.delete("/:id/managers", adminBranchController.removeManager);

module.exports = router;
