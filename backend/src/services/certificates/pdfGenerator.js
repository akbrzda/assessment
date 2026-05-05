const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const logger = require("../../utils/logger");

const UPLOAD_DIR = process.env.CERTIFICATES_UPLOAD_DIR
  ? path.resolve(process.env.CERTIFICATES_UPLOAD_DIR)
  : path.join(__dirname, "../../../uploads/certificates");

/**
 * Генерирует PDF-сертификат и сохраняет файл на диск.
 * Возвращает { filePath, fileName }.
 */
async function generatePdf({ uuid, fullName, courseTitle, issuedAt, scorePercent }) {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const fileName = `${uuid}.pdf`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 60,
    });

    const stream = fs.createWriteStream(filePath);
    stream.on("error", reject);
    stream.on("finish", resolve);
    doc.pipe(stream);

    const pageW = doc.page.width;
    const pageH = doc.page.height;

    // Фон
    doc.rect(0, 0, pageW, pageH).fill("#fafafa");

    // Рамка
    doc
      .roundedRect(30, 30, pageW - 60, pageH - 60, 8)
      .strokeColor("#4f46e5")
      .lineWidth(3)
      .stroke();

    // Заголовок
    doc.font("Helvetica-Bold").fontSize(36).fillColor("#1e1b4b").text("СЕРТИФИКАТ", 0, 80, { align: "center" });

    doc.font("Helvetica").fontSize(16).fillColor("#6b7280").text("о прохождении курса", 0, 130, { align: "center" });

    // Имя
    doc.font("Helvetica-Bold").fontSize(28).fillColor("#111827").text(fullName, 0, 195, { align: "center" });

    // Разделитель
    doc
      .moveTo(80, 245)
      .lineTo(pageW - 80, 245)
      .strokeColor("#e5e7eb")
      .lineWidth(1)
      .stroke();

    // Курс
    doc.font("Helvetica").fontSize(14).fillColor("#6b7280").text("успешно завершил(а) курс", 0, 265, { align: "center" });

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#4f46e5")
      .text(courseTitle, 80, 295, { align: "center", width: pageW - 160 });

    // Результат
    if (scorePercent != null) {
      doc
        .font("Helvetica")
        .fontSize(14)
        .fillColor("#374151")
        .text(`Результат: ${Number(scorePercent).toFixed(0)}%`, 0, 345, { align: "center" });
    }

    // Дата
    const dateStr = new Date(issuedAt).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    doc.font("Helvetica").fontSize(12).fillColor("#9ca3af").text(`Дата выдачи: ${dateStr}`, 0, 380, { align: "center" });

    // UUID и URL верификации
    const verifyUrl = `${process.env.BACKEND_URL || ""}/api/certificates/${uuid}`;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#9ca3af")
      .text(`ID: ${uuid}`, 0, pageH - 70, { align: "center" })
      .text(`Верификация: ${verifyUrl}`, 0, pageH - 55, { align: "center" });

    doc.end();
  });

  logger.info("pdfGenerator: сертификат сгенерирован uuid=%s path=%s", uuid, filePath);
  return { filePath, fileName };
}

module.exports = { generatePdf };
