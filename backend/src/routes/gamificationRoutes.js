const express = require('express');
const verifyInitData = require('../middleware/verifyInitData');
const resolveUser = require('../middleware/resolveUser');
const requireRole = require('../middleware/requireRole');
const gamificationController = require('../controllers/gamificationController');

const router = express.Router();

router.use(verifyInitData, resolveUser);

router.get('/overview', requireRole(['employee', 'manager', 'superadmin']), gamificationController.getOverview);
router.get('/badges', requireRole(['employee', 'manager', 'superadmin']), gamificationController.getBadges);
router.get('/team', requireRole(['employee', 'manager', 'superadmin']), gamificationController.getTeamChallenges);

module.exports = router;
