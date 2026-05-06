const referencesRepository = require("./repository");

async function getAdminReferences(currentUser = {}) {
  const roleName = String(currentUser.role || "").toLowerCase();

  let branchesPromise = referencesRepository.findBranches();
  let positionsPromise = referencesRepository.findPositions();

  if (roleName === "manager" && Number(currentUser.id) > 0) {
    let managerBranchIds = await referencesRepository.findManagerBranchIds(currentUser.id);

    if (managerBranchIds.length === 0) {
      const fallbackBranchId = await referencesRepository.findUserBranchId(currentUser.id);
      if (fallbackBranchId > 0) {
        managerBranchIds = [fallbackBranchId];
      }
    }

    const uniqueBranchIds = [...new Set(managerBranchIds)].filter((item) => Number(item) > 0);
    branchesPromise = referencesRepository.findBranchesByIds(uniqueBranchIds);
    positionsPromise = referencesRepository.findPositionsByBranchIds(uniqueBranchIds);
  }

  const [branches, positions, roles] = await Promise.all([branchesPromise, positionsPromise, referencesRepository.findRoles()]);

  return {
    branches,
    positions,
    roles,
  };
}

module.exports = {
  getAdminReferences,
};
