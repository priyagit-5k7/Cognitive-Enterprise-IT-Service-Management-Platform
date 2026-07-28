const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const monitoringController = require('../controllers/monitoringController');

// Public health check (no auth required)
router.get('/health', monitoringController.healthCheck);

router.use(authenticate);

router.get('/system-health', monitoringController.getSystemHealth);
router.get('/metrics', monitoringController.getMetrics);
router.get('/database', monitoringController.getDatabaseStats);
router.get('/alerts', monitoringController.getAlerts);
router.post('/alerts', monitoringController.createAlert);
router.post('/alerts/:id/resolve', monitoringController.resolveAlert);

module.exports = router;
