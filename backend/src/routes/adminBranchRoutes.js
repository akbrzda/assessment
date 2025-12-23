const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const adminBranchController = require("../controllers/adminBranchController");
const { cacheMiddleware, invalidateCacheMiddleware } = require("../middleware/cache");

// Все маршруты требуют JWT и роль superadmin
router.use(verifyJWT);
router.use(verifyAdminRole(["superadmin"]));

// Получить список управляющих (должен быть ДО /:id)
router.get("/managers/list", cacheMiddleware({ ttl: 300 }), adminBranchController.getManagers);

// Массовое назначение управляющего к филиалам (должен быть ДО /:id)
router.post(
  "/managers/assign-multiple",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(branches|references)/),
  adminBranchController.assignManagerToBranches
);

// Получить список филиалов
router.get("/", cacheMiddleware({ ttl: 300 }), adminBranchController.getBranches);

// Получить филиал по ID
router.get("/:id", cacheMiddleware({ ttl: 300 }), adminBranchController.getBranchById);

// Создать новый филиал
router.post("/", invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(branches|references)/), adminBranchController.createBranch);

// Обновить филиал
router.put("/:id", invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(branches|references)/), adminBranchController.updateBranch);

// Удалить филиал
router.delete("/:id", invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(branches|references)/), adminBranchController.deleteBranch);

// Назначить управляющего к филиалу
router.post("/:id/managers", invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/branches/), adminBranchController.assignManager);

// Удалить управляющего из филиала
router.delete("/:id/managers", invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/branches/), adminBranchController.removeManager);

module.exports = router;
