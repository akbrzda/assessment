const theoryModel = require("../../../../models/theoryModel");

async function getTheoryForAdmin(assessmentId) {
  return theoryModel.getTheoryForAdmin(assessmentId);
}

async function publishTheoryVersion(payload) {
  return theoryModel.publishTheoryVersion(payload);
}

module.exports = {
  getTheoryForAdmin,
  publishTheoryVersion,
};
