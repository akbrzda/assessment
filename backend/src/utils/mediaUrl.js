function normalizeSegment(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function resolveMediaBaseUrl() {
  const rawBaseUrl = process.env.MEDIA_BASE_URL || "https://cdn.akbrzda.ru";
  return String(rawBaseUrl).trim().replace(/\/+$/g, "");
}

function resolveMediaRootPrefix() {
  const prefix = normalizeSegment(process.env.MEDIA_ROOT_PREFIX || "theorica");
  return prefix || "theorica";
}

function buildMediaUrl(subfolder, fileName) {
  const normalizedSubfolder = normalizeSegment(subfolder);
  const normalizedFileName = normalizeSegment(fileName);

  if (!normalizedSubfolder || !normalizedFileName) {
    return "";
  }

  const mediaBaseUrl = resolveMediaBaseUrl();
  const mediaRootPrefix = resolveMediaRootPrefix();

  return `${mediaBaseUrl}/${mediaRootPrefix}/${normalizedSubfolder}/${normalizedFileName}`;
}

function extractFileNameFromMediaUrl(mediaUrl, subfolder) {
  const normalizedSubfolder = normalizeSegment(subfolder);
  const normalizedUrl = String(mediaUrl || "").trim();
  if (!normalizedUrl || !normalizedSubfolder) {
    return "";
  }

  const legacyPrefix = `/uploads/${normalizedSubfolder}/`;
  if (normalizedUrl.startsWith(legacyPrefix)) {
    return normalizeSegment(normalizedUrl.slice(legacyPrefix.length));
  }

  const cdnPrefix = `${resolveMediaBaseUrl()}/${resolveMediaRootPrefix()}/${normalizedSubfolder}/`;
  if (normalizedUrl.startsWith(cdnPrefix)) {
    return normalizeSegment(normalizedUrl.slice(cdnPrefix.length));
  }

  return "";
}

module.exports = {
  buildMediaUrl,
  extractFileNameFromMediaUrl,
  resolveMediaBaseUrl,
  resolveMediaRootPrefix,
};
