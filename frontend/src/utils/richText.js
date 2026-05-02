const TAG_RE = /<[^>]*>/g;
const BREAK_RE = /<br\s*\/?>/gi;
const NBSP_RE = /&nbsp;/gi;
const SPACE_RE = /\s+/g;

export const richTextToPlainText = (value) => {
  const source = String(value || "");
  return source
    .replace(BREAK_RE, " ")
    .replace(NBSP_RE, " ")
    .replace(TAG_RE, " ")
    .replace(SPACE_RE, " ")
    .trim();
};

export const isRichTextEmpty = (value) => !richTextToPlainText(value);

export const getRichTextPreview = (value, fallback = "") => {
  const text = richTextToPlainText(value);
  return text || fallback;
};
