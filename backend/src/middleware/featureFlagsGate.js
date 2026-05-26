const settingsService = require("../services/settingsService");
const { FEATURE_FLAGS_SETTING_KEY, getModuleCodeByPath } = require("../config/featureFlags");
const logger = require("../utils/logger");

function parseDisabledModules(rawValue) {
  if (!rawValue) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
  } catch (error) {
    logger.warn("Некорректный JSON в FEATURE_DISABLED_MODULES:", { error: error.message });
    return new Set();
  }
}

async function featureFlagsGate(req, res, next) {
  try {
    const moduleCode = getModuleCodeByPath(req.path || "");
    if (!moduleCode) {
      return next();
    }

    const rawValue = await settingsService.getSetting(FEATURE_FLAGS_SETTING_KEY, "[]");
    const disabledModules = parseDisabledModules(rawValue);

    if (!disabledModules.has(moduleCode)) {
      return next();
    }

    return res.status(403).json({
      error: "Модуль временно отключен администратором",
      code: "module_disabled",
      moduleCode,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = featureFlagsGate;
