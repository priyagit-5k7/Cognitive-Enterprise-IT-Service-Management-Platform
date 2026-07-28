const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/rbacMiddleware');
const devopsController = require('../controllers/devopsController');

router.use(authenticate);

router.get('/stats', devopsController.getStats);
router.get('/integrations', devopsController.getIntegrations);
router.post('/integrations', checkPermission('settings:write'), devopsController.createIntegration);
router.put('/integrations/:id', checkPermission('settings:write'), devopsController.updateIntegration);
router.get('/pipelines', devopsController.getPipelines);
router.post('/pipelines', checkPermission('settings:write'), devopsController.createPipeline);
router.put('/pipelines/:id/status', checkPermission('settings:write'), devopsController.updatePipelineStatus);
router.get('/deployments', devopsController.getDeployments);
router.post('/deployments', checkPermission('settings:write'), devopsController.createDeployment);
router.put('/deployments/:id', checkPermission('settings:write'), devopsController.updateDeployment);

module.exports = router;
