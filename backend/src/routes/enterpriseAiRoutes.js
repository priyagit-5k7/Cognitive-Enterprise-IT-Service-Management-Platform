const express = require('express');
const expressRouter = express.Router();
const { getCommandCenterMetrics, triggerAutoMlTraining, analyzeRootCause } = require('../controllers/enterpriseAiController');
const aiGatewayService = require('../services/aiGatewayService');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = expressRouter;

router.use(protect);

router.get('/metrics', authorize('Admin'), getCommandCenterMetrics);
router.post('/mlops/train', authorize('Admin'), triggerAutoMlTraining);
router.post('/analyze/root-cause', authorize('Admin', 'Manager', 'Support Engineer'), analyzeRootCause);

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
