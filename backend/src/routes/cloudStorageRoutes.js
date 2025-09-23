const express = require('express');
const verifyInitData = require('../middleware/verifyInitData');
const resolveUser = require('../middleware/resolveUser');
const cloudStorageController = require('../controllers/cloudStorageController');

const router = express.Router();

router.use(express.json());
router.use(verifyInitData, resolveUser);

router.post('/', cloudStorageController.setItem);
router.get('/:key', cloudStorageController.getItem);

module.exports = router;
