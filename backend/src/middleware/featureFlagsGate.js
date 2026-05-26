const settingsService = require("../services/settingsService");
const { FEATURE_FLAGS_SETTING_KEY, getModuleCodeByPath, getDisabledModulesSet } = require("../config/featureFlags");

async function featureFlagsGate(req, res, next) {
  try {
    const moduleCode = getModuleCodeByPath(req.path || "");
    if (!moduleCode) {
      return next();
    }

    const rawValue = await settingsService.getSetting(FEATURE_FLAGS_SETTING_KEY, "[]");
    const disabledModules = getDisabledModulesSet(rawValue);

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
