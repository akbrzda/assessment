const config = require("../config/env");
const settingsService = require("./settingsService");

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  return String(value).toLowerCase() === "true";
}

function parseIdList(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^\d+$/.test(item))
    .map((item) => Number(item));
}

async function getCoursesFeatureConfig() {
  const dbEnabledRaw = await settingsService.getSetting("COURSES_ENABLED", "false");
  const dbBranchIdsRaw = await settingsService.getSetting("COURSES_ENABLED_BRANCH_IDS", "");
  const dbPositionIdsRaw = await settingsService.getSetting("COURSES_ENABLED_POSITION_IDS", "");

  const enabled = config.courses.enabledConfigured ? config.courses.enabled : parseBoolean(dbEnabledRaw, false);
  const branchIds = config.courses.branchIds.length > 0 ? config.courses.branchIds : parseIdList(dbBranchIdsRaw);
  const positionIds = config.courses.positionIds.length > 0 ? config.courses.positionIds : parseIdList(dbPositionIdsRaw);

  return {
    enabled,
    branchIds,
    positionIds,
  };
}

async function isCoursesEnabledForUser(user) {
  const featureConfig = await getCoursesFeatureConfig();
  if (!featureConfig.enabled) {
    return false;
  }

  const hasBranchScope = featureConfig.branchIds.length > 0;
  const hasPositionScope = featureConfig.positionIds.length > 0;

  if (!hasBranchScope && !hasPositionScope) {
    return true;
  }

  if (!user) {
    return false;
  }

  const userBranchId = Number(user.branchId ?? user.branch_id ?? 0);
  const userPositionId = Number(user.positionId ?? user.position_id ?? 0);

  const branchAllowed = !hasBranchScope || featureConfig.branchIds.includes(userBranchId);
  const positionAllowed = !hasPositionScope || featureConfig.positionIds.includes(userPositionId);

  return branchAllowed && positionAllowed;
}

module.exports = {
  getCoursesFeatureConfig,
  isCoursesEnabledForUser,
};
