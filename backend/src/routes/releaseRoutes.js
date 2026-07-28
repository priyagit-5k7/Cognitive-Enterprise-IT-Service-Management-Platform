const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const releaseController = require('../controllers/releaseController');

router.use(authenticate);

router.get('/stats', releaseController.getStats);
router.get('/', releaseController.getAll);
router.post('/', releaseController.create);
router.get('/:id', releaseController.getById);
router.put('/:id', releaseController.update);
router.post('/:id/tasks', releaseController.createTask);
router.put('/:id/tasks/:taskId', releaseController.updateTask);

module.exports = router;
