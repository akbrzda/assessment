const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const { cacheMiddleware } = require("../../../middleware/cache");
const referencesController = require("./controller");

const router = express.Router();

// РЎРїСЂР°РІРѕС‡РЅРёРєРё РґРѕСЃС‚СѓРїРЅС‹ РІСЃРµРј Р°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Рј РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРј
router.use(verifyJWT);

router.get("/", cacheMiddleware({ ttl: 600 }), referencesController.getReferences);

module.exports = router;

