const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const { cacheMiddleware } = require("../../../middleware/cache");
const referencesController = require("./references.controller");

const router = express.Router();

// Справочники доступны всем авторизованным пользователям
router.use(verifyJWT);

router.get("/", cacheMiddleware({ ttl: 600 }), referencesController.getReferences);

module.exports = router;
