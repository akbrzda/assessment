const express = require('express');
const verifyInitData = require('../middleware/verifyInitData');
const resolveUser = require('../middleware/resolveUser');
const requireRole = require('../middleware/requireRole');
const leaderboardController = require('../controllers/leaderboardController');

const router = express.Router();

router.use(verifyInitData, resolveUser);

router.get(
  '/users',
  requireRole(['employee', 'manager', 'superadmin']),
  leaderboardController.getUserLeaderboard
);

module.exports = router;
