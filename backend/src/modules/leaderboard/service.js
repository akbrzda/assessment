const leaderboardRepository = require("./repository");

function mapFilterItems(items) {
  return items.map((item) => ({
    id: Number(item.id),
    name: item.name,
  }));
}

async function getUserLeaderboard({ userId, filters }) {
  const { branchId, positionId, limit } = filters;

  const [leaders, currentUser, branches, positions] = await Promise.all([
    leaderboardRepository.getLeaders({ branchId, positionId, limit }),
    leaderboardRepository.getCurrentUserRank({
      userId,
      branchId,
      positionId,
    }),
    leaderboardRepository.getBranches(),
    leaderboardRepository.getPositions(),
  ]);

  return {
    leaders: leaders.map((leader, index) => ({
      ...leader,
      rank: index + 1,
    })),
    filters: {
      branchId,
      positionId,
      branches: mapFilterItems(branches),
      positions: mapFilterItems(positions),
    },
    currentUser,
  };
}

module.exports = {
  getUserLeaderboard,
};
