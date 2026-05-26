const logger = require("../../utils/logger");
const repository = require("../../modules/certificates/repository");
const pdfGenerator = require("./pdfGenerator");
const settingsService = require("../settingsService");
const { resolveUploadsUrl } = require("../../utils/uploads");

/**
 * Основной сервис выдачи сертификатов.
 * Вызывается из assessmentEvents при result_passed.
 */
async function generateCertificate(userId, courseId, attemptId, { firstName, lastName, courseTitle, scorePercent } = {}) {
  // Создаём (или получаем существующую) запись
  const record = await repository.create({ userId, courseId, attemptId, scorePercent });

  if (!record) {
    logger.debug("certificateService: запись не создана для userId=%s courseId=%s", userId, courseId);
    return null;
  }

  if (record.status === "issued") {
    logger.debug("certificateService: сертификат уже выдан uuid=%s", record.uuid);
    return record;
  }

  return _doGenerate(record, { firstName, lastName, courseTitle, scorePercent });
}

/**
 * Внутренняя генерация PDF и обновление статуса.
 */
async function _doGenerate(record, { firstName, lastName, courseTitle, scorePercent }) {
  const { id, uuid } = record;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Сотрудник";
  const issuedAt = new Date();
  const validityDaysRaw = await settingsService.getSetting("CERTIFICATE_VALIDITY_DAYS", "365");
  const validityDays = Math.max(1, Number(validityDaysRaw) || 365);
  const expiresAt = new Date(issuedAt.getTime() + validityDays * 24 * 60 * 60 * 1000);

  try {
    const { filePath, fileName } = await pdfGenerator.generatePdf({
      uuid,
      fullName,
      courseTitle,
      issuedAt,
      scorePercent,
    });

    const fileUrl = resolveUploadsUrl("certificates", fileName);
    const snapshotData = { fullName, courseTitle, issuedAt: issuedAt.toISOString(), scorePercent };

    await repository.saveSnapshot(id, snapshotData);
    await repository.updateStatus(id, {
      status: "issued",
      filePath,
      fileUrl,
      issuedAt,
      expiresAt,
    });

    logger.info("certificateService: выдан сертификат id=%s uuid=%s userId=%s", id, uuid, record.user_id);
    return { id, uuid, filePath, fileUrl, status: "issued" };
  } catch (err) {
    logger.error("certificateService: ошибка генерации id=%s uuid=%s: %s", id, uuid, err.message);
    await repository.updateStatus(id, { status: "generation_failed" });
    return null;
  }
}

/**
 * Повторная генерация для записей со статусом generation_failed.
 * Вызывается из cron retryCertificates каждые 15 минут.
 */
async function retryFailedCertificates() {
  const failed = await repository.findFailed(20);
  if (!failed.length) return;

  logger.info("certificateService: повтор генерации для %d сертификатов", failed.length);

  for (const row of failed) {
    await _doGenerate(
      { id: row.id, uuid: row.uuid, user_id: row.user_id },
      {
        firstName: row.first_name,
        lastName: row.last_name,
        courseTitle: row.course_title,
        scorePercent: row.score_percent,
      },
    );
  }
}

module.exports = { generateCertificate, retryFailedCertificates };
