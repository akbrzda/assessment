const path = require("path");
const fs = require("fs");

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
  let extracted = "";

  if (normalizedUrl.startsWith(prefix)) {
    extracted = normalizedUrl.slice(prefix.length).replace(/^\/+|\/+$/g, "");
  } else {
    try {
      const parsedUrl = new URL(normalizedUrl);
      if (parsedUrl.pathname.startsWith(prefix)) {
        extracted = parsedUrl.pathname.slice(prefix.length).replace(/^\/+|\/+$/g, "");
      }
    } catch {
      return "";
    }
  }

  if (!extracted) return "";

  // Path traversal protection: extracted value must be a plain filename with no directory components.
  // path.basename strips any directory prefix — if the result differs, the input contained traversal sequences.
  const safeFileName = path.basename(extracted);
  if (!safeFileName || safeFileName !== extracted) {
    return "";
  }

  return safeFileName;
}

/**
 * Reads the first bytes of a file and identifies its type by magic bytes signature.
 * Returns 'image', 'video', or null if the signature is unknown.
 */
async function checkFileMagicBytes(filePath) {
  let fd;
  try {
    fd = await fs.promises.open(filePath, "r");
    const buffer = Buffer.alloc(12);
    await fd.read(buffer, 0, 12, 0);

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image";
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image";
    // GIF: 47 49 46 38 (GIF8)
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return "image";
    // WebP: RIFF????WEBP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    )
      return "image";
    // WebM: 1A 45 DF A3
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return "video";
    // OGG: OggS
    if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) return "video";
    // MP4/MOV: 'ftyp' marker at bytes 4–7
    if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return "video";

    return null;
  } catch {
    return null;
  } finally {
    if (fd) await fd.close().catch(() => {});
  }
}

module.exports = {
  UPLOADS_ROOT,
  resolveUploadsPath,
  resolveUploadsUrl,
  extractFileNameFromUploadsUrl,
  checkFileMagicBytes,
};
