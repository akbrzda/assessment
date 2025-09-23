const leaderboardModel = require('../models/leaderboardModel');
const referenceModel = require('../models/referenceModel');

function parseFilter(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

async function getUserLeaderboard(req, res, next) {
  try {
    const branchId = parseFilter(req.query.branchId);
    const positionId = parseFilter(req.query.positionId);
    const limit = req.query.limit ? Number(req.query.limit) : 30;

    const [leaders, currentUser, branches, positions] = await Promise.all([
      leaderboardModel.getUserLeaders({ branchId, positionId, limit }),
      leaderboardModel.getUserRankAndStats({
        userId: req.currentUser?.id,
        branchId,
        positionId
      }),
      referenceModel.getBranches(),
      referenceModel.getPositions()
    ]);

    const payload = leaders.map((leader, index) => ({
      ...leader,
      rank: index + 1
    }));

    res.json({
      leaders: payload,
      filters: {
        branchId,
        positionId,
        branches: branches.map((branch) => ({
          id: Number(branch.id),
          name: branch.name
        })),
        positions: positions.map((position) => ({
          id: Number(position.id),
          name: position.name
        }))
      },
      currentUser
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUserLeaderboard
};
