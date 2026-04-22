const gamificationRepository = require("./repository");

async function getOverview(currentUser) {
  const overview = await gamificationRepository.getUserOverview(currentUser.id);
  if (!overview) {
    const error = new Error("Пользователь не найден");
    error.status = 404;
    throw error;
  }

  return overview;
}

async function getBadges(currentUser) {
  const overview = await getOverview(currentUser);
  return overview.badges;
}

module.exports = {
  getOverview,
  getBadges,
};
