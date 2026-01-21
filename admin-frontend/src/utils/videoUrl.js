const cleanUrl = (value) => String(value || "").replace(/&amp;/gi, "&").replace(/&#38;/g, "&").replace(/\\u0026/g, "&").trim();
const ensureUrl = (value) => {
  try {
    return new URL(value).toString();
  } catch (error) {
    return "";
  }
};

export const normalizeVideoUrl = (value = "") => {
  const raw = cleanUrl(value);
  if (!raw) {
    return "";
  }

  const patterns = [
    /<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i,
    /<iframe[^>]*\sdata-src=["']([^"']+)["'][^>]*>/i,
    /src=["']([^"']+)["']/i,
    /(https?:\/\/[^\s"'<>]+)/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) {
      const candidate = cleanUrl(match[1] || match[0]);
      return ensureUrl(candidate);
    }
  }

  return ensureUrl(raw);
};
