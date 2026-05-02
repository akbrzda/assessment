const COURSE_CATEGORIES_STORAGE_KEY = "admin:courses:categories";

const DEFAULT_CATEGORIES = [
  { value: "service", label: "Сервис" },
  { value: "standards", label: "Стандарты" },
  { value: "safety", label: "Безопасность" },
  { value: "management", label: "Управление" },
  { value: "other", label: "Другое" },
];

const normalizeCategoryItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const rawValue = String(item.value || "").trim().toLowerCase();
  const rawLabel = String(item.label || "").trim();
  if (!rawValue || !rawLabel) return null;
  return { value: rawValue, label: rawLabel };
};

export const getDefaultCourseCategories = () => DEFAULT_CATEGORIES.map((item) => ({ ...item }));

export const loadCourseCategories = () => {
  try {
    const raw = localStorage.getItem(COURSE_CATEGORIES_STORAGE_KEY);
    if (!raw) {
      return getDefaultCourseCategories();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return getDefaultCourseCategories();
    }
    const normalized = parsed.map(normalizeCategoryItem).filter(Boolean);
    if (!normalized.length) {
      return getDefaultCourseCategories();
    }
    return normalized;
  } catch (error) {
    console.warn("Не удалось загрузить категории курсов из localStorage", error);
    return getDefaultCourseCategories();
  }
};

export const saveCourseCategories = (categories) => {
  try {
    localStorage.setItem(COURSE_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (error) {
    console.warn("Не удалось сохранить категории курсов в localStorage", error);
  }
};

export const normalizeCategoryValue = (value) => String(value || "").trim().toLowerCase();
