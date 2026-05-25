const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const config = require("../../config/env");
const logger = require("../../utils/logger");
const settingsService = require("../settingsService");
const { resolveUploadsPath, extractFileNameFromUploadsUrl } = require("../../utils/uploads");

const UPLOAD_DIR = config.certificatesUploadDir ? path.resolve(config.certificatesUploadDir) : resolveUploadsPath("certificates");

const WIDTH = 1240;
const HEIGHT = 1754;

function escapeXml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function resolveLogoDataUrl() {
  try {
    const logoUrl = await settingsService.getSetting("COMPANY_LOGO_URL");
    if (!logoUrl) return null;

    const relativeLogoPath = extractFileNameFromUploadsUrl(logoUrl, "logo") || logoUrl.replace(/^\/?uploads\/?/, "").replace(/^\/+/, "");
    const resolvedPath = resolveUploadsPath("logo", relativeLogoPath);
    if (!fs.existsSync(resolvedPath)) return null;

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeMap = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    const mimeType = mimeMap[ext] || "image/png";
    const buffer = fs.readFileSync(resolvedPath);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildCertificateSvg({ fullName, courseTitle, issuedAt, scorePercent, uuid, logoDataUrl }) {
  const dateStr = issuedAt ? new Date(issuedAt).toLocaleDateString("ru-RU") : "—";
  const resultStr = scorePercent != null ? `${Number(scorePercent).toFixed(0)}%` : "Успешно";
  const safeName = escapeXml(fullName || "Сотрудник");
  const safeCourse = escapeXml(courseTitle || "Курс");
  const safeUuid = escapeXml(uuid);
  const safeDate = escapeXml(dateStr);
  const safeResult = escapeXml(resultStr);

  const logoBlock = logoDataUrl
    ? `<image href="${logoDataUrl}" x="120" y="120" width="190" height="80" preserveAspectRatio="xMidYMid meet" />`
    : `
    <rect x="120" y="120" width="190" height="80" rx="10" fill="none" stroke="#d1d5db" stroke-width="2" stroke-dasharray="8 6" />
    <text x="215" y="155" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#6b7280">ЛОГОТИП</text>
    <text x="215" y="185" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#9ca3af">Ваш логотип</text>
  `;

  return `
 <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" transform="matrix(1,-1.2246467991473532e-16,1.2246467991473532e-16,1,0,0)">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff"></stop>
        <stop offset="100%" stop-color="#f6f7f9"></stop>
      </linearGradient>

      <linearGradient id="redGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e11d27"></stop>
        <stop offset="100%" stop-color="#b91c1c"></stop>
      </linearGradient>
      <pattern id="softLines" width="36" height="36" patternUnits="userSpaceOnUse">
        <path d="M0 36 C12 18 24 18 36 0" fill="none" stroke="#e5e7eb" stroke-width="1" opacity="0.45"></path>
      </pattern>
    </defs>

    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"></rect>

    <rect x="45" y="45" width="${WIDTH - 90}" height="${HEIGHT - 90}" rx="18" fill="none" stroke="#ef4444" stroke-opacity="0.35" stroke-width="2"></rect>

    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#softLines)" opacity="0.45"></rect>

    <path d="M0,${HEIGHT - 340} C260,${HEIGHT - 160} 560,${HEIGHT - 40} ${WIDTH},${HEIGHT - 105} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z" fill="url(#redGrad)"></path>

    <path d="M${WIDTH - 130},0 C${WIDTH - 70},120 ${WIDTH - 80},260 ${WIDTH},360 L${WIDTH},0 Z" fill="url(#redGrad)" opacity="0.95"></path>


    <text x="${WIDTH / 2}" y="410" text-anchor="middle" font-family="Arial, sans-serif" font-size="104" font-weight="800" fill="#c9151d">
      СЕРТИФИКАТ
    </text>

    <text x="${WIDTH / 2}" y="485" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="#6b7280">
      об успешном завершении курса
    </text>

    <line x1="420" y1="530" x2="560" y2="530" stroke="#c9151d" stroke-width="2"></line>
    <text x="${WIDTH / 2}" y="540" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#c9151d">◆</text>
    <line x1="680" y1="530" x2="820" y2="530" stroke="#c9151d" stroke-width="2"></line>

    <text x="${WIDTH / 2}" y="630" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#6b7280">
      Настоящий сертификат подтверждает, что
    </text>

    <text x="${WIDTH / 2}" y="750" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#111827">
      ${safeName}
    </text>

    <line x1="260" y1="800" x2="${WIDTH - 260}" y2="800" stroke="#ef4444" stroke-width="2"></line>

    <text x="${WIDTH / 2}" y="880" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#6b7280">
      успешно прошел(а) курс обучения
    </text>

    <rect x="${WIDTH / 2 - 180}" y="930" width="360" height="92" rx="20" fill="url(#redGrad)"></rect>

    <text x="${WIDTH / 2}" y="990" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#ffffff">
      ${safeCourse}
    </text>

    <rect x="260" y="1140" width="${WIDTH - 520}" height="155" rx="24" fill="#f9fafb"></rect>

    <line x1="${WIDTH / 2}" y1="1175" x2="${WIDTH / 2}" y2="1260" stroke="#d1d5db" stroke-width="2"></line>

    <text x="420" y="1208" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#111827">
      ${safeDate}
    </text>
    <text x="420" y="1253" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">
      Дата выдачи
    </text>

    <text x="820" y="1208" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#111827">
      ${safeResult}
    </text>
    <text x="820" y="1253" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">
      Результат
    </text>
  </svg>
`;
}

async function generatePng({ uuid, fullName, courseTitle, issuedAt, scorePercent }) {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const fileName = `${uuid}.png`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  const logoDataUrl = await resolveLogoDataUrl();
  const svg = buildCertificateSvg({ fullName, courseTitle, issuedAt, scorePercent, uuid, logoDataUrl });

  await sharp(Buffer.from(svg)).png({ quality: 100, compressionLevel: 9 }).toFile(filePath);

  logger.info("pngGenerator: сертификат сгенерирован uuid=%s path=%s", uuid, filePath);
  return { filePath, fileName };
}

module.exports = { generatePng };
