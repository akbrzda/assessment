const gamificationService = require("./service");
const { ensureCurrentUser } = require("./validators");

async function getOverview(req, res, next) {
  try {
    const currentUser = ensureCurrentUser(req.currentUser);
    const overview = await gamificationService.getOverview(currentUser);
    res.json({ overview });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

async function getBadges(req, res, next) {
  try {
    const currentUser = ensureCurrentUser(req.currentUser);
    const badges = await gamificationService.getBadges(currentUser);
    res.json({ badges });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

module.exports = {
  getOverview,
  getBadges,
};
