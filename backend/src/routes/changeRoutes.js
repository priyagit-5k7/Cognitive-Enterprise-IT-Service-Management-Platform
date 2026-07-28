const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/rbacMiddleware');
const changeController = require('../controllers/changeController');

router.use(authenticate);

router.get('/stats', changeController.getStats);
router.get('/', changeController.getAll);
router.post('/', changeController.create);
router.get('/:id', changeController.getById);
router.put('/:id', changeController.update);

// Tasks
router.post('/:id/tasks', changeController.createTask);
router.put('/:id/tasks/:taskId', changeController.updateTask);

// Approvals
router.post('/:id/approvers', checkPermission('manage_users'), changeController.addApprover);
router.post('/:id/approvals/:approvalId', changeController.submitApproval);

module.exports = router;
