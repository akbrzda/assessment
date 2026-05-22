const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const { cacheMiddleware } = require("../../../middleware/cache");
const referencesController = require("./controller");

const router = express.Router();

// Справочники доступны всем авторизованным пользователям
router.use(verifyJWT);

router.get(
  "/",
  cacheMiddleware({
    ttl: 600,
    keyGenerator: (req) => {
      const userId = Number(req.user?.id || 0);
      const role = String(req.user?.role || "guest").toLowerCase();
      return `http:${req.method}:${req.baseUrl}${req.path}:user:${userId}:role:${role}`;
    },
  }),
  referencesController.getReferences,
);

module.exports = router;
