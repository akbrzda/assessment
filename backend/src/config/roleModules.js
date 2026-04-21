const ROLE_DEFAULT_MODULES = {
  superadmin: ["*"],
  manager: ["assessments", "analytics", "users", "questions", "invitations"],
};

function getDefaultModulesForRole(roleName) {
  return ROLE_DEFAULT_MODULES[roleName] ? [...ROLE_DEFAULT_MODULES[roleName]] : [];
}

function hasDefaultModuleAccess(roleName, moduleCode) {
  const modules = getDefaultModulesForRole(roleName);
  return modules.includes("*") || modules.includes(moduleCode);
}

function getDefaultModulesMap() {
  return Object.keys(ROLE_DEFAULT_MODULES).reduce((acc, roleName) => {
    acc[roleName] = getDefaultModulesForRole(roleName);
    return acc;
  }, {});
}

module.exports = {
  ROLE_DEFAULT_MODULES,
  getDefaultModulesForRole,
  hasDefaultModuleAccess,
  getDefaultModulesMap,
};
