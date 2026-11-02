const express = require('express');
const expressRouter = express.Router();
const { getCommandCenterMetrics, triggerAutoMlTraining, analyzeRootCause } = require('../controllers/enterpriseAiController');
const aiGatewayService = require('../services/aiGatewayService');
const authenticate = require('../middlewares/authMiddleware');

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role_name)) {
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }
        next();
    };
};

const router = expressRouter;

router.use(authenticate);

router.get('/metrics', authorize('Admin'), getCommandCenterMetrics);
router.post('/mlops/train', authorize('Admin'), triggerAutoMlTraining);
router.post('/analyze/root-cause', authorize('Admin', 'Manager', 'Support Engineer'), analyzeRootCause);

// Status endpoint — lightweight liveness/readiness check
router.get('/status', (req, res) => {
    res.json({ status: 'operational', service: 'Enterprise AI Command Center', timestamp: new Date().toISOString() });
});

// Add explain route
router.post('/explain/prediction', async (req, res) => {
    try {
        const { modelName, features } = req.body;
        const explanation = await aiGatewayService.explainPrediction(modelName, features);
        res.json(explanation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
