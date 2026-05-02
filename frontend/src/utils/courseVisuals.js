import { BookOpen, Rocket, Lightbulb, Brain, Target, Wrench, ChartColumn, Puzzle, FlaskConical, Trophy } from "lucide-vue-next";

const COURSE_FALLBACK_ICONS = [BookOpen, Rocket, Lightbulb, Brain, Target, Wrench, ChartColumn, Puzzle, FlaskConical, Trophy];

const COURSE_FALLBACK_BACKGROUNDS = ["#EDE9FD", "#DDFBE7", "#FFF3E0", "#E3F0FC", "#FEE8ED", "#E7F7F7"];

function stableHash(value) {
  const source = String(value ?? "");
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCourseFallbackVisual(courseId) {
  const hash = stableHash(courseId);
  return {
    icon: COURSE_FALLBACK_ICONS[hash % COURSE_FALLBACK_ICONS.length],
    background: COURSE_FALLBACK_BACKGROUNDS[hash % COURSE_FALLBACK_BACKGROUNDS.length],
  };
}
