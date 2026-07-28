const pool = require('../config/db');
const aiGatewayService = require('../services/aiGatewayService');

const getCommandCenterMetrics = async (req, res) => {
    try {
        // Fetch standard metrics from PG
        const modelsResult = await pool.query('SELECT COUNT(*) as count FROM ai_models WHERE is_active = true');
        const jobsResult = await pool.query('SELECT COUNT(*) as count FROM ai_training_jobs WHERE status = $1', ['Pending']);
        const driftResult = await pool.query('SELECT COUNT(*) as count FROM ai_prediction_logs WHERE drift_detected = true');

        // Fetch deep metrics from Python Microservice
        const mlopsMetrics = await aiGatewayService.getMlOpsMetrics();
        const driftMetrics = await aiGatewayService.checkDrift();
        const forecast = await aiGatewayService.getForecast();

        res.json({
            status: 'success',
            metrics: {
                active_models: parseInt(modelsResult.rows[0].count),
                pending_training_jobs: parseInt(jobsResult.rows[0].count),
                drift_events: parseInt(driftResult.rows[0].count),
                mlops: mlopsMetrics,
                drift: driftMetrics,
                forecast: forecast
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const triggerAutoMlTraining = async (req, res) => {
    try {
        const { dataset_name, model_type } = req.body;
        
        // Trigger Python microservice
        const trainingJob = await aiGatewayService.triggerTraining(dataset_name, model_type);

        if (!trainingJob) {
            return res.status(503).json({ status: 'error', message: 'AI Microservice unreachable' });
        }

        // Log into Postgres
        const result = await pool.query(
            'INSERT INTO ai_training_jobs (model_type, dataset_name, status, mlflow_run_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [model_type, dataset_name, trainingJob.status, trainingJob.mlflow_run_id]
        );

        res.status(201).json({ status: 'success', job: result.rows[0] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const analyzeRootCause = async (req, res) => {
    try {
        const { description } = req.body;
        const analysis = await aiGatewayService.analyzeRootCause(description);
        
        if (!analysis) {
            return res.status(503).json({ status: 'error', message: 'AI Microservice unreachable' });
        }
        
        res.json({ status: 'success', analysis });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    getCommandCenterMetrics,
    triggerAutoMlTraining,
    analyzeRootCause
};
