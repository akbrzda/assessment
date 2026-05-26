const path = require("path");
const fs = require("fs");
const logger = require("../../utils/logger");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_CERTIFICATE_STATUSES = new Set(["issued", "revoked", "expired"]);
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
    const graceDays = Math.max(
      0,
      Number(await settingsService.getSetting("CERTIFICATE_GRACE_DAYS", "0")) ||
        0,
    );
    const items = await repository.findByUserId(userId);
    const normalized = items.map((item) => ({
      ...item,
      display_status: repository.resolveDisplayStatus(item, graceDays),
    }));
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
    if (!UUID_RE.test(uuid)) {
      return res.status(404).json({ error: "Сертификат не найден" });
    }
    const graceDays = Math.max(
      0,
      Number(await settingsService.getSetting("CERTIFICATE_GRACE_DAYS", "0")) ||
        0,
    );
    const cert = await repository.findByUuid(uuid);
    if (!cert || cert.status === "revoked") {
      return res.status(404).json({ error: "Сертификат не найден" });
    }
    if (String(req.query.download || "").toLowerCase() === "true") {
      return streamCertificateFile(res, cert, graceDays);
    }

    // Не возвращаем внутренние пути
    const { file_path, ...safeFields } = cert;
    res.json({
      ...safeFields,
      display_status: repository.resolveDisplayStatus(cert, graceDays),
    });
  } catch (err) {
    next(err);
  }
}

function streamCertificateFile(res, cert, graceDays) {
  if (!cert || cert.status !== "issued") {
    return res.status(404).json({ error: "Сертификат не найден или не готов" });
  }
  if (repository.resolveDisplayStatus(cert, graceDays) === "expired") {
    return res.status(409).json({
      error: "Срок действия сертификата истек, скачивание недоступно",
    });
  }
  if (!cert.file_path || !fs.existsSync(cert.file_path)) {
    return res.status(404).json({ error: "Файл сертификата не найден" });
  }

  const extension = path.extname(cert.file_path || "").toLowerCase();
  const mimeType =
    extension === ".pdf"
      ? "application/pdf"
      : extension === ".png"
        ? "image/png"
        : "application/octet-stream";
  res.setHeader("Content-Type", mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="certificate-${cert.uuid}${extension || ".pdf"}"`,
  );
  fs.createReadStream(cert.file_path).pipe(res);
  return null;
}

/**
 * GET /api/certificates/:uuid/download
 * Скачивание файла сертификата.
 */
async function downloadCertificate(req, res, next) {
  try {
    const { uuid } = req.params;
    if (!UUID_RE.test(uuid)) {
      return res.status(404).json({ error: "Сертификат не найден" });
    }
    const graceDays = Math.max(
      0,
      Number(await settingsService.getSetting("CERTIFICATE_GRACE_DAYS", "0")) ||
        0,
    );
    const cert = await repository.findByUuid(uuid);
    // Для MiniApp-запросов проверяем, что сертификат принадлежит текущему пользователю.
    // Для admin-запросов (req.user) проверка владельца не нужна.
    if (
      req.currentUser &&
      cert &&
      Number(cert.user_id) !== Number(req.currentUser.id)
    ) {
      return res.status(403).json({ error: "Нет доступа к этому сертификату" });
    }
    return streamCertificateFile(res, cert, graceDays);
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
    if (status && !ALLOWED_CERTIFICATE_STATUSES.has(status)) {
      return res
        .status(422)
        .json({
          error: "Недопустимое значение параметра status",
          validationErrors: [
            {
              field: "status",
              message: `Допустимые значения: ${[...ALLOWED_CERTIFICATE_STATUSES].join(", ")}`,
            },
          ],
        });
    }
    const graceDays = Math.max(
      0,
      Number(await settingsService.getSetting("CERTIFICATE_GRACE_DAYS", "0")) ||
        0,
    );
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
      items: (result.items || []).map((item) => ({
        ...item,
        display_status: repository.resolveDisplayStatus(item, graceDays),
      })),
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
      return res
        .status(404)
        .json({ error: "Сертификат не найден или уже аннулирован" });
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
    const parsedUserId = Number(req.body?.userId);
    const parsedCourseId = Number(req.body?.courseId);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return res.status(422).json({
        error: "Некорректное значение userId",
        validationErrors: [
          {
            field: "userId",
            message: "Должно быть положительным целым числом",
          },
        ],
      });
    }
    if (!Number.isInteger(parsedCourseId) || parsedCourseId <= 0) {
      return res.status(422).json({
        error: "Некорректное значение courseId",
        validationErrors: [
          {
            field: "courseId",
            message: "Должно быть положительным целым числом",
          },
        ],
      });
    }

    const userId = parsedUserId;
    const courseId = parsedCourseId;

    const userRow = await repository.findUserById(userId);
    if (!userRow)
      return res.status(404).json({ error: "Пользователь не найден" });

    const courseRow = await repository.findCourseById(courseId);
    if (!courseRow) return res.status(404).json({ error: "Курс не найден" });

    const cert = await certificateService.generateCertificate(
      userId,
      courseId,
      null,
      {
        firstName: userRow.first_name,
        lastName: userRow.last_name,
        courseTitle: courseRow.title,
        scorePercent: null,
      },
    );

    if (!cert) {
      return res
        .status(500)
        .json({ error: "Не удалось сгенерировать сертификат" });
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

    const graceDays = Math.max(
      0,
      Number(await settingsService.getSetting("CERTIFICATE_GRACE_DAYS", "0")) ||
        0,
    );
    const reason = String(req.body?.reason || "").trim();
    const comment = String(req.body?.comment || "").trim();
    if (!reason) {
      return res
        .status(400)
        .json({ error: "Причина переквалификации обязательна" });
    }

    const result = await repository.resetCourseProgressByCertificateId(
      certificateId,
      {
        requestedBy: req.user?.id || null,
        reason,
        comment,
        graceDays,
      },
    );
    if (!result.ok) {
      if (result.reason === "not_found") {
        return res.status(404).json({ error: "Сертификат не найден" });
      }
      if (result.reason === "not_expired") {
        return res.status(409).json({
          error:
            "Переквалификация доступна только для просроченного сертификата",
        });
      }
      return res.status(409).json({
        error: "Переквалификация недоступна для текущего статуса сертификата",
      });
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
