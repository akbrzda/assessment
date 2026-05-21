/**
 * Безопасная санитизация HTML-контента перед рендерингом через v-html.
 * Удаляет script-теги и опасные атрибуты (on*, javascript: href/src).
 *
 * Использует DOMParser в браузере; в не-браузерном окружении (тесты) —
 * regex-fallback с аналогичными гарантиями.
 */
export function sanitizeHtml(html) {
  if (!html) return "";

  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    doc.querySelectorAll("script").forEach((node) => node.remove());
    doc.querySelectorAll("*").forEach((node) => {
      for (const attr of [...node.attributes]) {
        const attrName = attr.name.toLowerCase();
        const attrValue = String(attr.value || "")
          .trim()
          .toLowerCase();
        if (attrName.startsWith("on")) {
          node.removeAttribute(attr.name);
        } else if ((attrName === "href" || attrName === "src") && attrValue.startsWith("javascript:")) {
          node.removeAttribute(attr.name);
        }
      }
    });

    return doc.body.innerHTML;
  }

  // Fallback для не-браузерного окружения (тесты, SSR)
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "")
    .replace(/(href|src)\s*=\s*["']javascript:[^"']*["']/gi, '$1=""');
}

/**
 * Форматирует и санитизирует plain-text контент:
 * переводит \n в <br>, затем применяет sanitizeHtml.
 */
export function formatAndSanitize(text) {
  if (!text) return "";
  return sanitizeHtml(String(text).replace(/\n/g, "<br>"));
}
