const FEATURE_FLAGS_SETTING_KEY = "FEATURE_DISABLED_MODULES";

const FEATURE_MODULES = [
  { code: "users", name: "Пользователи" },
  { code: "assessments", name: "Аттестации" },
  { code: "courses", name: "Курсы" },
  { code: "questions", name: "Банк вопросов" },
  { code: "analytics", name: "Аналитика и отчёты" },
  { code: "invitations", name: "Приглашения" },
  { code: "branches", name: "Филиалы" },
  { code: "positions", name: "Должности" },
  { code: "gamification", name: "Геймификация" },
  { code: "certificates", name: "Сертификаты" },
  { code: "settings", name: "Настройки", locked: true },
];

const ADMIN_LINKED_MODULE_CODES = ["users", "questions", "analytics", "invitations", "branches", "positions"];
const CLIENT_MODULE_CODES = ["courses", "assessments", "gamification", "certificates"];

const MODULE_ROUTE_PREFIXES = [
  { prefix: "/admin/dashboard", moduleCode: "analytics" },
  { prefix: "/admin/users", moduleCode: "users" },
  { prefix: "/admin/search", moduleCode: "users" },
  { prefix: "/admin/assessments", moduleCode: "assessments" },
  { prefix: "/assessments", moduleCode: "assessments" },
  { prefix: "/admin/courses", moduleCode: "courses" },
  { prefix: "/courses", moduleCode: "courses" },
  { prefix: "/admin/question-bank", moduleCode: "questions" },
  { prefix: "/admin/analytics", moduleCode: "analytics" },
  { prefix: "/analytics", moduleCode: "analytics" },
  { prefix: "/admin/invitations", moduleCode: "invitations" },
  { prefix: "/invitations", moduleCode: "invitations" },
  { prefix: "/admin/branches", moduleCode: "branches" },
  { prefix: "/admin/positions", moduleCode: "positions" },
  { prefix: "/admin/gamification/rules", moduleCode: "gamification" },
  { prefix: "/gamification", moduleCode: "gamification" },
  { prefix: "/leaderboard", moduleCode: "gamification" },
  { prefix: "/admin/badges", moduleCode: "gamification" },
  { prefix: "/admin/levels", moduleCode: "gamification" },
  { prefix: "/admin/certificates", moduleCode: "certificates" },
  { prefix: "/certificates", moduleCode: "certificates" },
  { prefix: "/verify", moduleCode: "certificates" },
];

const LOCKED_MODULE_CODES = new Set(FEATURE_MODULES.filter((item) => item.locked).map((item) => item.code));

function getModuleCodeByPath(pathname = "") {
  const matched = MODULE_ROUTE_PREFIXES.find((item) => pathname.startsWith(item.prefix));
  return matched ? matched.moduleCode : null;
}

module.exports = {
  FEATURE_FLAGS_SETTING_KEY,
  FEATURE_MODULES,
  ADMIN_LINKED_MODULE_CODES,
  CLIENT_MODULE_CODES,
  LOCKED_MODULE_CODES,
  getModuleCodeByPath,
};
