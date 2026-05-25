const path = require("path");
const fs = require("fs");
const logger = require("../../utils/logger");
const repository = require("./repository");
const certificateService = require("../../services/certificates/certificateService");
const settingsService = require("../../services/settingsService");
const { logAndSend } = require("../../services/auditService");

/**
 * GET /api/certificates/my
 * Список сертификатов текущего пользователя.
 */
async function getMyCertificates(req, res, next) {
  try {
    const userId = req.currentUser?.id;
    if (!userId) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }
    const graceDays = Math.max(0, Number(await settingsService.getSetting("CERTIFICATE_GRACE_DAYS", "0")) || 0);
    const items = await repository.findByUserId(userId);
    const normalized = items.map((item) => ({ ...item, display_status: repository.resolveDisplayStatus(item, graceDays) }));
    res.json({ items: normalized });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/certificates/:uuid
 * Публичные метаданные сертификата (верификация).
 */
async function getCertificateByUuid(req, res, next) {
  try {
    const { uuid } = req.params;
    const graceDays = Math.max(0, Number(await settingsService.getSetting("CERTIFICATE_GRACE_DAYS", "0")) || 0);
    const cert = await repository.findByUuid(uuid);
    if (!cert || cert.status === "revoked") {
      return res.status(404).json({ error: "Сертификат не найден" });
    }
    // Не возвращаем внутренние пути
    const { file_path, ...safeFields } = cert;
    res.json({ ...safeFields, display_status: repository.resolveDisplayStatus(cert, graceDays) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/certificates/:uuid/download
 * Скачивание PNG файла.
 */
async function downloadCertificate(req, res, next) {
  try {
    const { uuid } = req.params;
    const graceDays = Math.max(0, Number(await settingsService.getSetting("CERTIFICATE_GRACE_DAYS", "0")) || 0);
    const cert = await repository.findByUuid(uuid);
    if (!cert || cert.status !== "issued") {
      return res.status(404).json({ error: "Сертификат не найден или не готов" });
    }
    if (repository.resolveDisplayStatus(cert, graceDays) === "expired") {
      return res.status(409).json({ error: "Срок действия сертификата истек, скачивание недоступно" });
    }
    if (!cert.file_path || !fs.existsSync(cert.file_path)) {
      return res.status(404).json({ error: "Файл сертификата не найден" });
    }
    const extension = path.extname(cert.file_path || "").toLowerCase();
    const mimeType = extension === ".png" ? "image/png" : "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="certificate-${uuid}${extension || ".png"}"`);
    fs.createReadStream(cert.file_path).pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/certificates
 * Список сертификатов с фильтрами.
 */
async function listCertificates(req, res, next) {
  try {
    const { userId, courseId, status, page = 1, limit = 20 } = req.query;
    const graceDays = Math.max(0, Number(await settingsService.getSetting("CERTIFICATE_GRACE_DAYS", "0")) || 0);
    const result = await repository.findAll({
      userId: userId ? Number(userId) : null,
      courseId: courseId ? Number(courseId) : null,
      status: status || null,
      page: Math.max(1, Number(page)),
      limit: Math.min(100, Math.max(1, Number(limit))),
      graceDays,
    });
    res.json({
      ...result,
      items: (result.items || []).map((item) => ({ ...item, display_status: repository.resolveDisplayStatus(item, graceDays) })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/certificates/:id/revoke
 * Аннулирование сертификата.
 */
async function revokeCertificate(req, res, next) {
  try {
    const id = Number(req.params.id);
    const adminId = req.user.id;
    const success = await repository.revoke(id, adminId);
    if (!success) {
      return res.status(404).json({ error: "Сертификат не найден или уже аннулирован" });
    }
    await logAndSend({
      req,
      actor: { id: adminId },
      action: "certificate.revoked",
      entity: "certificate",
      entityId: id,
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/certificates/issue
 * Ручная выдача сертификата администратором.
 */
async function issueCertificate(req, res, next) {
  try {
    const { userId, courseId } = req.body;
    if (!userId || !courseId) {
      return res.status(400).json({ error: "userId и courseId обязательны" });
    }

    const userRow = await repository.findUserById(userId);
    if (!userRow) return res.status(404).json({ error: "Пользователь не найден" });

    const courseRow = await repository.findCourseById(courseId);
    if (!courseRow) return res.status(404).json({ error: "Курс не найден" });

    const cert = await certificateService.generateCertificate(userId, courseId, null, {
      firstName: userRow.first_name,
      lastName: userRow.last_name,
      courseTitle: courseRow.title,
      scorePercent: null,
    });

    if (!cert) {
      return res.status(500).json({ error: "Не удалось сгенерировать сертификат" });
    }
    await logAndSend({
      req,
      actor: { id: req.user?.id },
      action: "certificate.issued",
      entity: "certificate",
      entityId: cert.id || null,
      metadata: { userId, courseId },
    });
    res.status(201).json(cert);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/certificates/:id/requalify
 * Отправка пользователя на переквалификацию по просроченному сертификату.
 */
async function sendToRequalification(req, res, next) {
  try {
    const certificateId = Number(req.params.id);
    if (!Number.isFinite(certificateId) || certificateId <= 0) {
      return res.status(400).json({ error: "Некорректный id сертификата" });
    }

    const graceDays = Math.max(0, Number(await settingsService.getSetting("CERTIFICATE_GRACE_DAYS", "0")) || 0);
    const reason = String(req.body?.reason || "").trim();
    const comment = String(req.body?.comment || "").trim();
    if (!reason) {
      return res.status(400).json({ error: "Причина переквалификации обязательна" });
    }

    const result = await repository.resetCourseProgressByCertificateId(certificateId, {
      requestedBy: req.user?.id || null,
      reason,
      comment,
      graceDays,
    });
    if (!result.ok) {
      if (result.reason === "not_found") {
        return res.status(404).json({ error: "Сертификат не найден" });
      }
      if (result.reason === "not_expired") {
        return res.status(409).json({ error: "Переквалификация доступна только для просроченного сертификата" });
      }
      return res.status(409).json({ error: "Переквалификация недоступна для текущего статуса сертификата" });
    }

    await logAndSend({
      req,
      actor: { id: req.user?.id },
      action: "certificate.requalification_requested",
      entity: "certificate",
      entityId: result.certificateId,
      metadata: {
        userId: result.userId,
        courseId: result.courseId,
      },
    });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyCertificates,
  getCertificateByUuid,
  downloadCertificate,
  listCertificates,
  revokeCertificate,
  issueCertificate,
  sendToRequalification,
};
