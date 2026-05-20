const moduleService = require("./service");

async function listUsers(req, res, next) {
  try {
    return await moduleService.listUsers(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserLoginHistory(req, res, next) {
  try {
    return await moduleService.getUserLoginHistory(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function exportUsersToExcel(req, res, next) {
  try {
    return await moduleService.exportUsersToExcel(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserDetailedStats(req, res, next) {
  try {
    return await moduleService.getUserDetailedStats(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserCourses(req, res, next) {
  try {
    return await moduleService.getUserCourses(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    return await moduleService.getUserById(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    return await moduleService.createUser(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    return await moduleService.updateUser(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    return await moduleService.deleteUser(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    return await moduleService.resetPassword(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function resetAssessmentProgress(req, res, next) {
  try {
    return await moduleService.resetAssessmentProgress(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function bulkUpdateRole(req, res, next) {
  try {
    return await moduleService.bulkUpdateRole(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function bulkTransferBranch(req, res, next) {
  try {
    return await moduleService.bulkTransferBranch(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function bulkExportUsers(req, res, next) {
  try {
    return await moduleService.bulkExportUsers(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function getPermissions(req, res, next) {
  try {
    return await moduleService.getPermissions(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function setPermissionOverride(req, res, next) {
  try {
    return await moduleService.setPermissionOverride(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function deletePermissionOverride(req, res, next) {
  try {
    return await moduleService.deletePermissionOverride(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function addUserRole(req, res, next) {
  try {
    return await moduleService.addUserRole(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function removeUserRole(req, res, next) {
  try {
    return await moduleService.removeUserRole(req, res, next);
  } catch (error) {
    next(error);
  }
}

async function grantAppAccess(req, res, next) {
  try {
    return await moduleService.grantAppAccess(req, res, next);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  getUserLoginHistory,
  exportUsersToExcel,
  getUserDetailedStats,
  getUserCourses,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  resetAssessmentProgress,
  bulkUpdateRole,
  bulkTransferBranch,
  bulkExportUsers,
  getPermissions,
  setPermissionOverride,
  deletePermissionOverride,
  addUserRole,
  removeUserRole,
  grantAppAccess,
};
