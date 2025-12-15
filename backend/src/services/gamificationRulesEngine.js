const rulesModel = require("../models/gamificationRulesModel");
const settingsService = require("./settingsService");

let cache = { rules: [], loadedAt: 0 };
const CACHE_TTL_MS = 30 * 1000;

async function getRules(connection) {
  const now = Date.now();
  if (now - cache.loadedAt > CACHE_TTL_MS) {
    cache.rules = await rulesModel.listActiveRules(connection);
    cache.loadedAt = now;
  }
  return cache.rules;
}

function clearCache() {
  cache = { rules: [], loadedAt: 0 };
}

function withinScope(ruleScope, ctx) {
  if (!ruleScope) return true;
  const { branchIds, positionIds, assessmentIds } = ruleScope;
  if (Array.isArray(branchIds) && branchIds.length && !branchIds.includes(ctx.branchId)) return false;
  if (Array.isArray(positionIds) && positionIds.length && !positionIds.includes(ctx.positionId)) return false;
  if (Array.isArray(assessmentIds) && assessmentIds.length && !assessmentIds.includes(ctx.assessmentId)) return false;
  return true;
}

function checkCondition(cond, ctx) {
  if (!cond) return true;
  if (cond.event && cond.event !== ctx.event) return false;
  if (cond.passed !== undefined && !!cond.passed !== !!ctx.passed) return false;
  if (cond.perfect && !ctx.perfect) return false;
  if (cond.min_score !== undefined && Number(ctx.scorePercent) < Number(cond.min_score)) return false;
  if (cond.max_score !== undefined && Number(ctx.scorePercent) > Number(cond.max_score)) return false;
  if (cond.max_time_ratio !== undefined && (ctx.timeRatio == null || Number(ctx.timeRatio) > Number(cond.max_time_ratio))) return false;
  if (cond.min_streak !== undefined && Number(ctx.currentStreak || 0) < Number(cond.min_streak)) return false;
  if (cond.answer_correct !== undefined && !!cond.answer_correct !== !!ctx.answerCorrect) return false;
  return true;
}

function computePoints(formula, ctx) {
  if (!formula) return 0;
  const mode = formula.mode || "fixed";
  if (mode === "fixed") return Number(formula.value || 0);
  if (mode === "percent_of_score") {
    const base = Math.max(0, Math.floor(Number(ctx.scorePercent || 0)));
    let val = Math.round(base * Number(formula.value || 1));
    if (formula.cap !== undefined) val = Math.min(val, Number(formula.cap));
    return val;
  }
  if (mode === "multiplier") {
    const base = Number(ctx.basePoints || 0);
    return Math.round(base * Number(formula.value || 1));
  }
  return 0;
}

async function evaluate({ connection, context, combine = "additive" } = {}) {
  const enabled = (await settingsService.getSetting("GAMIFICATION_RULES_ENABLED")) === "true";
  if (!enabled) {
    return { usedRules: false, events: [], badges: [] };
  }

  const rules = await getRules(connection);
  if (!rules.length) {
    return { usedRules: false, events: [], badges: [] };
  }

  const events = [];
  const badges = new Set();

  for (const rule of rules) {
    if (!withinScope(rule.scope, context)) continue;
    if (!checkCondition(rule.condition, context)) continue;

    if (rule.ruleType === "points") {
      const points = computePoints(rule.formula, context);
      if (points) {
        events.push({ type: rule.code, points, description: rule.name });
      }
    } else if (rule.ruleType === "badge") {
      const code = rule.formula?.badge_code;
      if (code) badges.add(code);
    }

    if (combine === "first-match" && (events.length || badges.size)) break;
  }

  return { usedRules: true, events, badges: Array.from(badges) };
}

module.exports = {
  evaluate,
  clearCache,
};
