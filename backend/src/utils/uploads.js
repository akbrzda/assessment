const path = require("path");

const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");

function normalizeSegment(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function resolveUploadsPath(...segments) {
  const normalizedSegments = segments.map(normalizeSegment).filter(Boolean);
  return path.join(UPLOADS_ROOT, ...normalizedSegments);
}

function resolveUploadsUrl(subfolder, fileName) {
  const normalizedSubfolder = normalizeSegment(subfolder);
  const normalizedFileName = normalizeSegment(fileName);
  if (!normalizedSubfolder || !normalizedFileName) {
    return "";
  }

  return `/uploads/${normalizedSubfolder}/${normalizedFileName}`;
}

function extractFileNameFromUploadsUrl(fileUrl, subfolder) {
  const normalizedSubfolder = normalizeSegment(subfolder);
  const normalizedUrl = String(fileUrl || "").trim();
  if (!normalizedSubfolder || !normalizedUrl) {
    return "";
  }

  const prefix = `/uploads/${normalizedSubfolder}/`;
  if (normalizedUrl.startsWith(prefix)) {
    return normalizedUrl.slice(prefix.length).replace(/^\/+|\/+$/g, "");
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    if (parsedUrl.pathname.startsWith(prefix)) {
      return parsedUrl.pathname.slice(prefix.length).replace(/^\/+|\/+$/g, "");
    }
  } catch {
    return "";
  }

  return "";
}

module.exports = {
  UPLOADS_ROOT,
  resolveUploadsPath,
  resolveUploadsUrl,
  extractFileNameFromUploadsUrl,
};
