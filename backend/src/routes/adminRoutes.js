const express = require('express');
const adminUserController = require('../controllers/adminUserController');
const verifyInitData = require('../middleware/verifyInitData');
const resolveUser = require('../middleware/resolveUser');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(verifyInitData, resolveUser, requireRole(['superadmin']));

router.get('/users', adminUserController.listUsers);
router.patch('/users/:id', adminUserController.updateUser);
router.delete('/users/:id', adminUserController.deleteUser);

module.exports = router;
