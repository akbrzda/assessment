const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const checkModuleAccess = require("../../../middleware/checkModuleAccess");
const {
  cacheMiddleware,
  invalidateCacheMiddleware,
} = require("../../../middleware/cache");
const positionsController = require("./controller");

const router = express.Router();

router.use(verifyJWT);
router.use(checkModuleAccess("positions"));

router.get("/", cacheMiddleware({ ttl: 300 }), positionsController.getPositions);
router.get("/:id", cacheMiddleware({ ttl: 300 }), positionsController.getPositionById);
router.post(
  "/",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(positions|references)/),
  positionsController.createPosition,
);
router.put(
  "/:id",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(positions|references)/),
  positionsController.updatePosition,
);
router.delete(
  "/:id",
  invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(positions|references)/),
  positionsController.deletePosition,
);

module.exports = router;

