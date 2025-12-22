const WORDS_PER_MINUTE = 200;
const MIN_READING_SECONDS = 5;

const countWords = (text = "") => {
  if (!text) return 0;
  return text
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/).length;
};

export const calculateReadingSeconds = (text = "") => {
  const words = countWords(text);
  if (words === 0) {
    return 0;
  }
  const minutes = words / WORDS_PER_MINUTE;
  return Math.max(MIN_READING_SECONDS, Math.ceil(minutes * 60));
};

export const sumReadingSeconds = (blocks = []) =>
  blocks.reduce((total, block) => {
    if (block.type !== "text") {
      return total;
    }
    return total + calculateReadingSeconds(block.content || "");
  }, 0);

export const formatReadingTime = (seconds) => {
  if (!seconds) {
    return "несколько секунд";
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs} сек`;
  }
  if (secs === 0) {
    return `${mins} мин`;
  }
  return `${mins} мин ${secs} сек`;
};
