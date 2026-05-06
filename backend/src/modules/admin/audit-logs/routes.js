const express = require("express");
const verifyJWT = require("../../../middleware/verifyJWT");
const controller = require("./controller");

const router = express.Router();

// Только авторизованные суперадмины имеют доступ к журналу аудита.
router.use(verifyJWT);

router.use((req, res, next) => {
  if (req.user?.role !== "superadmin") {
    return res.status(403).json({ error: "Доступ запрещён" });
  }
  next();
});

router.get("/", controller.listAuditLogs);
router.get("/:id", controller.getAuditLogById);

module.exports = router;
