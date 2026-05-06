const express = require("express");
const verifyInitData = require("../../middleware/verifyInitData");
const resolveUser = require("../../middleware/resolveUser");
const verifyJWT = require("../../middleware/verifyJWT");
const controller = require("./controller");

// Публичная верификация сертификата по UUID
const verifyRouter = express.Router();
verifyRouter.get("/:uuid", controller.getCertificateByUuid);

// Публичные маршруты (MiniApp)
const publicRouter = express.Router();
publicRouter.use(verifyInitData, resolveUser);
publicRouter.get("/my", controller.getMyCertificates);
publicRouter.get("/:uuid", controller.getCertificateByUuid);
publicRouter.get("/:uuid/download", controller.downloadCertificate);

// Маршруты для администратора
const adminRouter = express.Router();
adminRouter.use(verifyJWT);
adminRouter.get("/", controller.listCertificates);
adminRouter.get("/:uuid/download", controller.downloadCertificate);
adminRouter.post("/issue", controller.issueCertificate);
adminRouter.post("/:id/revoke", controller.revokeCertificate);

module.exports = { verifyRouter, publicRouter, adminRouter };
