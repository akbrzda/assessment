const express = require('express');
const authController = require('../controllers/authController');
const verifyInitData = require('../middleware/verifyInitData');
const resolveUser = require('../middleware/resolveUser');

const router = express.Router();

router.post('/status', verifyInitData, resolveUser, authController.getStatus);
router.post('/register', verifyInitData, resolveUser, authController.register);
router.get('/profile', verifyInitData, resolveUser, authController.getProfile);
router.patch('/profile', verifyInitData, resolveUser, authController.updateProfile);
router.get('/references', verifyInitData, authController.getReferences);

module.exports = router;
