const theoryModel = require("../../../../models/theoryModel");

async function getTheoryForAdmin(assessmentId) {
  return theoryModel.getTheoryForAdmin(assessmentId);
}

async function saveDraftVersion(payload) {
  return theoryModel.saveDraftVersion(payload);
}

async function publishDraftVersion(payload) {
  return theoryModel.publishDraftVersion(payload);
}

module.exports = {
  getTheoryForAdmin,
  saveDraftVersion,
  publishDraftVersion,
};
