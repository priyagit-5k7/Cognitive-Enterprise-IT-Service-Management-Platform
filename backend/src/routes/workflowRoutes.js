const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/rbacMiddleware');
const workflowController = require('../controllers/workflowController');

router.use(authenticate);

router.get('/stats', workflowController.getStats);
router.get('/', workflowController.getAll);
router.post('/', checkPermission('settings:write'), workflowController.create);
router.get('/:id', workflowController.getById);
router.put('/:id', checkPermission('settings:write'), workflowController.update);
router.delete('/:id', checkPermission('settings:write'), workflowController.delete);

// Steps
router.post('/:id/steps', checkPermission('settings:write'), workflowController.addStep);
router.delete('/:id/steps/:stepId', checkPermission('settings:write'), workflowController.deleteStep);

// Execution
router.post('/:id/execute', workflowController.execute);
router.get('/:id/executions', workflowController.getExecutions);
router.get('/:id/executions/:execId/logs', workflowController.getExecutionLogs);

module.exports = router;
