function stripHtmlToText(value) {
  const raw = String(value || "");
  const withoutTags = raw.replace(/<[^>]+>/g, " ");
  const normalized = withoutTags
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

export function isTopicVisible(topic) {
  if (!topic) {
    return false;
  }

  const contentText = stripHtmlToText(topic.content || "");
  const hasContent = contentText.length > 0;
  return hasContent;
}

export function getVisibleTopics(topics) {
  if (!Array.isArray(topics)) {
    return [];
  }

  return topics.filter((topic) => isTopicVisible(topic));
}

export function sectionHasVisibleTopics(section) {
  return getVisibleTopics(section?.topics).length > 0;
}
