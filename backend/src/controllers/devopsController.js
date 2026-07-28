/**
 * devopsController.js — DevOps Integration Controller (Phase 20)
 */
const db = require('../config/db');

// ─── Integrations ──────────────────────────────────────────────────────────────

exports.getIntegrations = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT di.*, u.name AS created_by_name FROM devops_integrations di
      LEFT JOIN users u ON di.created_by = u.id ORDER BY di.created_at DESC
    `);
    // Mask sensitive config fields
    const safe = rows.map(r => ({ ...r, config: { ...r.config, token: r.config?.token ? '****' : undefined } }));
    res.json({ integrations: safe });
  } catch (err) {
    console.error('[DevopsController] getIntegrations:', err);
    res.status(500).json({ message: 'Failed to fetch integrations' });
  }
};

exports.createIntegration = async (req, res) => {
  try {
    const { name, provider, config } = req.body;
    if (!name || !provider) return res.status(400).json({ message: 'Name and provider are required' });
    const { rows } = await db.query(`
      INSERT INTO devops_integrations (name, provider, config, created_by)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [name, provider, JSON.stringify(config || {}), req.user.id]);
    res.status(201).json({ message: 'Integration created', integration: { ...rows[0], config: { provider } } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Integration with this name already exists' });
    console.error('[DevopsController] createIntegration:', err);
    res.status(500).json({ message: 'Failed to create integration' });
  }
};

exports.updateIntegration = async (req, res) => {
  try {
    const { name, config, isActive } = req.body;
    const { rows } = await db.query(`
      UPDATE devops_integrations SET name = COALESCE($1, name),
        config = COALESCE($2::jsonb, config), is_active = COALESCE($3, is_active), updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 RETURNING *
    `, [name || null, config ? JSON.stringify(config) : null, isActive !== undefined ? isActive : null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Integration not found' });
    res.json({ message: 'Integration updated', integration: rows[0] });
  } catch (err) {
    console.error('[DevopsController] updateIntegration:', err);
    res.status(500).json({ message: 'Failed to update integration' });
  }
};

// ─── Pipelines ─────────────────────────────────────────────────────────────────

exports.getPipelines = async (req, res) => {
  try {
    const { integrationId, status } = req.query;
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (integrationId) { where.push(`dp.integration_id = $${i++}`); params.push(integrationId); }
    if (status) { where.push(`dp.status = $${i++}`); params.push(status); }
    const { rows } = await db.query(`
      SELECT dp.*, di.name AS integration_name, di.provider
      FROM devops_pipelines dp
      LEFT JOIN devops_integrations di ON dp.integration_id = di.id
      WHERE ${where.join(' AND ')}
      ORDER BY dp.last_run_at DESC NULLS LAST
    `, params);
    res.json({ pipelines: rows });
  } catch (err) {
    console.error('[DevopsController] getPipelines:', err);
    res.status(500).json({ message: 'Failed to fetch pipelines' });
  }
};

exports.createPipeline = async (req, res) => {
  try {
    const { integrationId, pipelineName, pipelineId, repository, branch } = req.body;
    if (!integrationId || !pipelineName) return res.status(400).json({ message: 'integrationId and pipelineName are required' });
    const { rows } = await db.query(`
      INSERT INTO devops_pipelines (integration_id, pipeline_name, pipeline_id, repository, branch)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [integrationId, pipelineName, pipelineId || null, repository || null, branch || 'main']);
    res.status(201).json({ message: 'Pipeline registered', pipeline: rows[0] });
  } catch (err) {
    console.error('[DevopsController] createPipeline:', err);
    res.status(500).json({ message: 'Failed to create pipeline' });
  }
};

exports.updatePipelineStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Running', 'Success', 'Failed', 'Cancelled', 'Unknown'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const { rows } = await db.query(`
      UPDATE devops_pipelines SET status = $1, last_run_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 RETURNING *
    `, [status, req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Pipeline not found' });
    res.json({ message: 'Pipeline status updated', pipeline: rows[0] });
  } catch (err) {
    console.error('[DevopsController] updatePipelineStatus:', err);
    res.status(500).json({ message: 'Failed to update pipeline' });
  }
};

// ─── Deployments ───────────────────────────────────────────────────────────────

exports.getDeployments = async (req, res) => {
  try {
    const { pipelineId, environment, status } = req.query;
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (pipelineId) { where.push(`dd.pipeline_id = $${i++}`); params.push(pipelineId); }
    if (environment) { where.push(`dd.environment = $${i++}`); params.push(environment); }
    if (status) { where.push(`dd.status = $${i++}`); params.push(status); }
    const { rows } = await db.query(`
      SELECT dd.*, dp.pipeline_name, di.provider, u.name AS deployed_by_name
      FROM devops_deployments dd
      LEFT JOIN devops_pipelines dp ON dd.pipeline_id = dp.id
      LEFT JOIN devops_integrations di ON dp.integration_id = di.id
      LEFT JOIN users u ON dd.deployed_by = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY dd.created_at DESC LIMIT 50
    `, params);
    res.json({ deployments: rows });
  } catch (err) {
    console.error('[DevopsController] getDeployments:', err);
    res.status(500).json({ message: 'Failed to fetch deployments' });
  }
};

exports.createDeployment = async (req, res) => {
  try {
    const { pipelineId, environment, version } = req.body;
    if (!environment) return res.status(400).json({ message: 'Environment is required' });
    const { rows } = await db.query(`
      INSERT INTO devops_deployments (pipeline_id, environment, version, status, started_at, deployed_by)
      VALUES ($1,$2,$3,'Running',CURRENT_TIMESTAMP,$4) RETURNING *
    `, [pipelineId || null, environment, version || null, req.user.id]);
    res.status(201).json({ message: 'Deployment started', deployment: rows[0] });
  } catch (err) {
    console.error('[DevopsController] createDeployment:', err);
    res.status(500).json({ message: 'Failed to create deployment' });
  }
};

exports.updateDeployment = async (req, res) => {
  try {
    const { status, logs } = req.body;
    const completed = ['Success', 'Failed', 'Rolled Back'].includes(status);
    const { rows } = await db.query(`
      UPDATE devops_deployments SET status = COALESCE($1, status), logs = COALESCE($2, logs),
        completed_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $4 RETURNING *
    `, [status || null, logs || null, completed, req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Deployment not found' });
    res.json({ message: 'Deployment updated', deployment: rows[0] });
  } catch (err) {
    console.error('[DevopsController] updateDeployment:', err);
    res.status(500).json({ message: 'Failed to update deployment' });
  }
};

// ─── Stats ─────────────────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  try {
    const { rows: integStats } = await db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active FROM devops_integrations`);
    const { rows: pipeStats } = await db.query(`
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='Success') AS successful,
             COUNT(*) FILTER (WHERE status='Failed') AS failed FROM devops_pipelines
    `);
    const { rows: deployStats } = await db.query(`
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='Success') AS successful,
             COUNT(*) FILTER (WHERE status='Failed') AS failed,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h
      FROM devops_deployments
    `);
    res.json({ integrations: integStats[0], pipelines: pipeStats[0], deployments: deployStats[0] });
  } catch (err) {
    console.error('[DevopsController] getStats:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
