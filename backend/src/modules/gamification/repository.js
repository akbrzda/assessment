const gamificationService = require("../../services/gamificationService");

async function getUserOverview(userId) {
  return gamificationService.getUserOverview(userId);
}

module.exports = {
  getUserOverview,
};
