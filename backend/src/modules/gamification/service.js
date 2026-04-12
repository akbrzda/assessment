const gamificationRepository = require("./repository");

function assertCurrentUser(currentUser) {
  if (!currentUser) {
    const error = new Error("Требуется авторизация");
    error.status = 401;
    throw error;
  }
}

async function getOverview(currentUser) {
  assertCurrentUser(currentUser);

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
