const leaderboardService = require("./service");
const { normalizeLeaderboardFilters } = require("./validators");

async function getUserLeaderboard(req, res, next) {
  try {
    const filters = normalizeLeaderboardFilters(req.query);
    const payload = await leaderboardService.getUserLeaderboard({
      userId: req.currentUser?.id,
      filters,
    });

    res.json(payload);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUserLeaderboard,
};
