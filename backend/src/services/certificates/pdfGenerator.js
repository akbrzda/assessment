const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const config = require("../../config/env");
const logger = require("../../utils/logger");
const settingsService = require("../settingsService");
const { resolveUploadsPath, extractFileNameFromUploadsUrl } = require("../../utils/uploads");

const UPLOAD_DIR = config.certificatesUploadDir ? path.resolve(config.certificatesUploadDir) : resolveUploadsPath("certificates");

async function resolveLogoPath() {
  try {
    const logoUrl = await settingsService.getSetting("COMPANY_LOGO_URL");
    if (!logoUrl) return null;

    const relativeLogoPath = extractFileNameFromUploadsUrl(logoUrl, "logo") || logoUrl.replace(/^\/?uploads\/?/, "").replace(/^\/+/, "");
    const resolvedPath = resolveUploadsPath("logo", relativeLogoPath);
    if (!fs.existsSync(resolvedPath)) return null;
    return resolvedPath;
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU");
}

function drawHeader(doc, { fullName, courseTitle, issuedAt, scorePercent, uuid, logoPath }) {
  doc.rect(0, 0, 842, 595).fill("#ffffff");
  doc.rect(18, 18, 806, 559).lineWidth(2).stroke("#dc2626");

  if (logoPath) {
    try {
      doc.image(logoPath, 56, 46, { fit: [120, 60], align: "left", valign: "top" });
    } catch {}
  }

  const dateStr = formatDate(issuedAt);
  const resultStr = scorePercent != null ? `${Number(scorePercent).toFixed(0)}%` : "Успешно";

  doc.fillColor("#b91c1c").fontSize(52).font("Helvetica-Bold").text("СЕРТИФИКАТ", 0, 120, { align: "center" });
  doc.fillColor("#4b5563").fontSize(18).font("Helvetica").text("об успешном завершении курса", 0, 178, { align: "center" });
  doc.moveTo(250, 210).lineTo(592, 210).lineWidth(1).strokeColor("#dc2626").stroke();

  doc.fillColor("#6b7280").fontSize(16).text("Настоящий сертификат подтверждает, что", 0, 250, { align: "center" });
  doc.fillColor("#111827").fontSize(34).font("Helvetica-Bold").text(fullName || "Сотрудник", 0, 285, { align: "center" });
  doc.moveTo(180, 332).lineTo(662, 332).lineWidth(1).strokeColor("#e5e7eb").stroke();
  doc.fillColor("#6b7280").fontSize(16).font("Helvetica").text("успешно прошел(а) курс обучения", 0, 350, { align: "center" });
  doc.fillColor("#991b1b").fontSize(24).font("Helvetica-Bold").text(courseTitle || "Курс", 0, 382, { align: "center" });

  doc.fillColor("#111827").fontSize(14).font("Helvetica-Bold").text(`Дата выдачи: ${dateStr}`, 170, 455);
  doc.fillColor("#111827").fontSize(14).font("Helvetica-Bold").text(`Результат: ${resultStr}`, 170, 482);
  doc.fillColor("#6b7280").fontSize(11).font("Helvetica").text(`UUID: ${uuid}`, 170, 510);
}

async function generatePdf({ uuid, fullName, courseTitle, issuedAt, scorePercent }) {
  const dateStr = issuedAt ? new Date(issuedAt).toLocaleDateString("ru-RU") : "—";
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const fileName = `${uuid}.pdf`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  const logoPath = await resolveLogoPath();

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    drawHeader(doc, { fullName, courseTitle, issuedAt, scorePercent, uuid, logoPath });
    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  logger.info("pdfGenerator: сертификат сгенерирован uuid=%s path=%s date=%s", uuid, filePath, dateStr);
  return { filePath, fileName };
}

module.exports = { generatePdf };
