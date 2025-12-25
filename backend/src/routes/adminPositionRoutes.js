const express = require("express");
const router = express.Router();
const verifyJWT = require("../middleware/verifyJWT");
const checkModuleAccess = require("../middleware/checkModuleAccess");
const adminPositionController = require("../controllers/adminPositionController");
const { cacheMiddleware, invalidateCacheMiddleware } = require("../middleware/cache");

router.use(verifyJWT);
router.use(checkModuleAccess("positions"));

router.get("/", cacheMiddleware({ ttl: 300 }), adminPositionController.getPositions);
router.get("/:id", cacheMiddleware({ ttl: 300 }), adminPositionController.getPositionById);
router.post("/", invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(positions|references)/), adminPositionController.createPosition);
router.put("/:id", invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(positions|references)/), adminPositionController.updatePosition);
router.delete("/:id", invalidateCacheMiddleware(/^http:GET:.*\/api\/admin\/(positions|references)/), adminPositionController.deletePosition);

module.exports = router;
