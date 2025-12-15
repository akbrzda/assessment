const gamificationService = require('../services/gamificationService');

async function getOverview(req, res, next) {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const overview = await gamificationService.getUserOverview(req.currentUser.id);
    if (!overview) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json({ overview });
  } catch (error) {
    next(error);
  }
}

async function getBadges(req, res, next) {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const overview = await gamificationService.getUserOverview(req.currentUser.id);
    if (!overview) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json({ badges: overview.badges });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  getBadges
};
