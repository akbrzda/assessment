const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");
const verifyJWT = require("../middleware/verifyJWT");
const verifyAdminRole = require("../middleware/verifyAdminRole");
const { cacheMiddleware } = require("../middleware/cache");

router.use(verifyJWT, verifyAdminRole(["superadmin", "manager"]));

/**
 * Получить все справочники для админ-панели
 */
router.get("/", cacheMiddleware({ ttl: 600 }), async (req, res, next) => {
  try {
    const [branches] = await pool.query("SELECT id, name, city, is_visible_in_miniapp FROM branches ORDER BY name");
    const [positions] = await pool.query("SELECT id, name, is_visible_in_miniapp FROM positions ORDER BY name");
    const [roles] = await pool.query("SELECT id, name, description FROM roles ORDER BY name");

    res.json({
      branches,
      positions,
      roles,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
