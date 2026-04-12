const referencesRepository = require("./repository");

async function getAdminReferences() {
  const [branches, positions, roles] = await Promise.all([
    referencesRepository.findBranches(),
    referencesRepository.findPositions(),
    referencesRepository.findRoles(),
  ]);

  return {
    branches,
    positions,
    roles,
  };
}

module.exports = {
  getAdminReferences,
};

