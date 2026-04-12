const theoryRepository = require("./assessments-theory.repository");

async function getTheory(assessmentId) {
  const theory = await theoryRepository.getTheoryForAdmin(assessmentId);
  if (!theory) {
    const error = new Error("Аттестация не найдена");
    error.status = 404;
    throw error;
  }

  return theory;
}

async function saveDraft(assessmentId, payload) {
  return theoryRepository.saveDraftVersion({
    assessmentId,
    requiredBlocks: payload.requiredBlocks,
    optionalBlocks: payload.optionalBlocks || [],
    metadata: payload.metadata ?? null,
  });
}

async function publish(assessmentId, payload) {
  return theoryRepository.publishDraftVersion({
    assessmentId,
    mode: payload.mode,
  });
}

module.exports = {
  getTheory,
  saveDraft,
  publish,
};
