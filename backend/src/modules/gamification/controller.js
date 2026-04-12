const gamificationService = require("./service");

async function getOverview(req, res, next) {
  try {
    const overview = await gamificationService.getOverview(req.currentUser);
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
    const badges = await gamificationService.getBadges(req.currentUser);
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
