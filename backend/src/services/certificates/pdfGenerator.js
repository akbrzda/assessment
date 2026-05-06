const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const logger = require("../../utils/logger");
const settingsService = require("../settingsService");

const UPLOAD_DIR = process.env.CERTIFICATES_UPLOAD_DIR
  ? path.resolve(process.env.CERTIFICATES_UPLOAD_DIR)
  : path.join(__dirname, "../../../uploads/certificates");

const UPLOADS_ROOT = path.join(__dirname, "../../../uploads");

const WIDTH = 1240;
const HEIGHT = 1754;

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function resolveLogoDataUrl() {
  try {
    const logoUrl = await settingsService.getSetting("COMPANY_LOGO_URL");
    if (!logoUrl) return null;

    const relativeLogoPath = logoUrl.replace(/^\/?uploads\/?/, "").replace(/^\/+/, "");
    const resolvedPath = path.join(UPLOADS_ROOT, relativeLogoPath);
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
    ? `<image href="${logoDataUrl}" x="80" y="70" width="180" height="70" preserveAspectRatio="xMidYMid meet" />`
    : `
      <rect x="80" y="70" width="180" height="70" rx="8" fill="none" stroke="#d1d5db" stroke-width="2" stroke-dasharray="8 6" />
      <text x="170" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#9ca3af">ЛОГОТИП</text>
    `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f5f6f8"/>
        </linearGradient>
        <linearGradient id="redGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#df1a24"/>
          <stop offset="100%" stop-color="#be1119"/>
        </linearGradient>
      </defs>

      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)" />
      <rect x="28" y="28" width="${WIDTH - 56}" height="${HEIGHT - 56}" rx="16" fill="none" stroke="#ef4444" stroke-opacity="0.35" stroke-width="2"/>

      <polygon points="${WIDTH - 200},0 ${WIDTH},0 ${WIDTH},200" fill="#c9151d"/>
      <path d="M0,${HEIGHT - 330} C220,${HEIGHT - 120} 520,${HEIGHT - 20} ${WIDTH},${HEIGHT - 90} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z" fill="url(#redGrad)"/>

      <rect x="${WIDTH - 240}" y="0" width="180" height="300" fill="url(#redGrad)"/>
      <polygon points="${WIDTH - 240},300 ${WIDTH - 150},360 ${WIDTH - 60},300" fill="url(#redGrad)"/>
      <circle cx="${WIDTH - 150}" cy="140" r="58" fill="#ffffff"/>
      <text x="${WIDTH - 150}" y="152" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" fill="#c9151d">🎓</text>

      ${logoBlock}

      <text x="${WIDTH / 2}" y="360" text-anchor="middle" font-family="Arial, sans-serif" font-size="96" font-weight="800" fill="#c9151d">СЕРТИФИКАТ</text>
      <text x="${WIDTH / 2}" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" fill="#6b7280">об успешном завершении курса</text>

      <line x1="420" y1="470" x2="560" y2="470" stroke="#c9151d" stroke-width="2"/>
      <text x="${WIDTH / 2}" y="478" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#c9151d">◆</text>
      <line x1="680" y1="470" x2="820" y2="470" stroke="#c9151d" stroke-width="2"/>

      <text x="${WIDTH / 2}" y="560" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" fill="#6b7280">Настоящий сертификат подтверждает, что</text>
      <text x="${WIDTH / 2}" y="670" text-anchor="middle" font-family="Arial, sans-serif" font-size="74" font-weight="700" fill="#111827">${safeName}</text>
      <line x1="220" y1="720" x2="${WIDTH - 220}" y2="720" stroke="#ef4444" stroke-width="2"/>
      <text x="${WIDTH / 2}" y="800" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" fill="#6b7280">успешно прошел(а) курс обучения</text>

      <rect x="380" y="850" width="480" height="96" rx="24" fill="url(#redGrad)"/>
      <text x="${WIDTH / 2}" y="915" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${safeCourse}</text>

      <rect x="220" y="1030" width="${WIDTH - 440}" height="170" rx="24" fill="#f3f4f6"/>
      <line x1="${WIDTH / 2}" y1="1065" x2="${WIDTH / 2}" y2="1165" stroke="#d1d5db" stroke-width="2"/>

      <text x="390" y="1095" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="#6b7280">${safeDate}</text>
      <text x="390" y="1145" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#111827">Дата выдачи</text>

      <text x="850" y="1095" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="#6b7280">${safeResult}</text>
      <text x="850" y="1145" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#111827">Результат</text>

      <text x="${WIDTH / 2}" y="1270" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">ID: ${safeUuid}</text>
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

  await sharp(Buffer.from(svg))
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(filePath);

  logger.info("pngGenerator: сертификат сгенерирован uuid=%s path=%s", uuid, filePath);
  return { filePath, fileName };
}

module.exports = { generatePng };
