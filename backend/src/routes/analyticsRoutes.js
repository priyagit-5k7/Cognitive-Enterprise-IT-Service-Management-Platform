const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authenticate = require('../middlewares/authMiddleware');

router.use(authenticate);

// Overview KPIs
router.get('/overview', analyticsController.getOverview);

// Ticket breakdowns
router.get('/tickets/status', analyticsController.getTicketsByStatus);
router.get('/tickets/priority', analyticsController.getTicketsByPriority);
router.get('/tickets/category', analyticsController.getTicketsByCategory);

// Performance & SLA
router.get('/engineers', analyticsController.getEngineerPerformance);
router.get('/sla', analyticsController.getSlaCompliance);
router.get('/workload', analyticsController.getSupportWorkload);

// Trends
router.get('/trends/monthly', analyticsController.getMonthlyTrends);
router.get('/trends/weekly', analyticsController.getWeeklyTrends);

// AI
router.get('/ai/accuracy', analyticsController.getAiAccuracy);

// Export
router.get('/export', analyticsController.exportData);

module.exports = router;
