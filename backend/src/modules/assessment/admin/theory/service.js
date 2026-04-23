const theoryRepository = require("./repository");

async function getTheory(assessmentId) {
  const theory = await theoryRepository.getTheoryForAdmin(assessmentId);
  if (!theory) {
    const error = new Error("Аттестация не найдена");
    error.status = 404;
    throw error;
  }

  return theory;
}

async function publish(assessmentId, payload) {
  return theoryRepository.publishTheoryVersion({
    assessmentId,
    mode: payload.mode,
    requiredBlocks: payload.requiredBlocks,
    optionalBlocks: payload.optionalBlocks || [],
    metadata: payload.metadata ?? null,
  });
}

module.exports = {
  getTheory,
  publish,
};
