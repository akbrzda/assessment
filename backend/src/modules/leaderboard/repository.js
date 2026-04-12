const leaderboardModel = require("../../models/leaderboardModel");
const referenceModel = require("../../models/referenceModel");

async function getLeaders(filters) {
  return leaderboardModel.getUserLeaders(filters);
}

async function getCurrentUserRank(params) {
  return leaderboardModel.getUserRankAndStats(params);
}

async function getBranches() {
  return referenceModel.getBranches();
}

async function getPositions() {
  return referenceModel.getPositions();
}

module.exports = {
  getLeaders,
  getCurrentUserRank,
  getBranches,
  getPositions,
};
