const express = require('express');
const assessmentController = require('../controllers/assessmentController');
const verifyInitData = require('../middleware/verifyInitData');
const resolveUser = require('../middleware/resolveUser');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(verifyInitData, resolveUser);

router.get('/user', requireRole(['employee', 'manager', 'superadmin']), assessmentController.listForUser);
router.get('/user/:id', requireRole(['employee', 'manager', 'superadmin']), assessmentController.getForUser);
router.post('/:id/attempts', requireRole(['employee', 'manager', 'superadmin']), assessmentController.startAttempt);
router.post('/:id/attempts/:attemptId/answers', requireRole(['employee', 'manager', 'superadmin']), assessmentController.submitAnswer);
router.post('/:id/attempts/:attemptId/complete', requireRole(['employee', 'manager', 'superadmin']), assessmentController.completeAttempt);
router.get('/:id/attempts/:attemptId', requireRole(['employee', 'manager', 'superadmin']), assessmentController.getAttemptResultController);
router.get('/admin', requireRole(['superadmin', 'manager']), assessmentController.listManaged);
router.get('/admin/targets', requireRole(['superadmin', 'manager']), assessmentController.listTargets);
router.post('/admin', requireRole(['superadmin', 'manager']), assessmentController.create);
router.get('/admin/:id', requireRole(['superadmin', 'manager']), assessmentController.getDetail);
router.patch('/admin/:id', requireRole(['superadmin', 'manager']), assessmentController.update);
router.delete('/admin/:id', requireRole(['superadmin', 'manager']), assessmentController.remove);

module.exports = router;
