const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const {
  cacheMiddleware,
  invalidateCacheMiddleware,
} = require("../../../middleware/cache");
const branchController = require("./branches.controller");

const router = express.Router();

router.use(verifyJWT);
router.use(checkModuleAccess("branches"));

router.get("/managers/list", cacheMiddleware({ ttl: 300 }), branchController.getManagers);
router.post(
  "/managers/assign-multiple",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(branches|references)/),
  branchController.assignManagerToBranches,
);
router.get("/", cacheMiddleware({ ttl: 300 }), branchController.getBranches);
router.get("/:id", cacheMiddleware({ ttl: 300 }), branchController.getBranchById);
router.post(
  "/",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(branches|references)/),
  branchController.createBranch,
);
router.put(
  "/:id",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(branches|references)/),
  branchController.updateBranch,
);
router.delete(
  "/:id",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(branches|references)/),
  branchController.deleteBranch,
);
router.post(
  "/:id/managers",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/branches/),
  branchController.assignManager,
);
router.delete(
  "/:id/managers",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/branches/),
  branchController.removeManager,
);

module.exports = router;
