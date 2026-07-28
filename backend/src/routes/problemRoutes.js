const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const problemController = require('../controllers/problemController');

router.use(authenticate);

router.get('/stats', problemController.getStats);
router.get('/known-errors', problemController.getKnownErrors);
router.get('/', problemController.getAll);
router.post('/', problemController.create);
router.get('/:id', problemController.getById);
router.put('/:id', problemController.update);
router.post('/:id/known-errors', problemController.createKnownError);
router.post('/:id/link-incident', problemController.linkIncident);

module.exports = router;
