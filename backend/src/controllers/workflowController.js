/**
 * workflowController.js — Workflow Automation Controller (Phase 18)
 */
const db = require('../config/db');
const workflowEngine = require('../services/workflowEngine');

exports.getAll = async (req, res) => {
  try {
    const { isActive, category, search } = req.query;
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (isActive !== undefined) { where.push(`w.is_active = $${i++}`); params.push(isActive === 'true'); }
    if (category) { where.push(`w.category = $${i++}`); params.push(category); }
    if (search) { where.push(`(w.name ILIKE $${i} OR w.description ILIKE $${i})`); params.push(`%${search}%`); i++; }

    const { rows } = await db.query(`
      SELECT w.*, u.name AS created_by_name,
             (SELECT COUNT(*) FROM workflow_steps ws WHERE ws.workflow_id = w.id) AS step_count,
             (SELECT COUNT(*) FROM workflow_executions we WHERE we.workflow_id = w.id) AS execution_count,
             (SELECT COUNT(*) FROM workflow_executions we WHERE we.workflow_id = w.id AND we.status = 'Failed') AS failure_count
      FROM workflows w
      LEFT JOIN users u ON w.created_by = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY w.created_at DESC
    `, params);
    res.json({ workflows: rows });
  } catch (err) {
    console.error('[WorkflowController] getAll:', err);
    res.status(500).json({ message: 'Failed to fetch workflows' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { rows: wfRows } = await db.query(`
      SELECT w.*, u.name AS created_by_name FROM workflows w
      LEFT JOIN users u ON w.created_by = u.id WHERE w.id = $1
    `, [req.params.id]);
    if (!wfRows[0]) return res.status(404).json({ message: 'Workflow not found' });

    const { rows: steps } = await db.query(`SELECT * FROM workflow_steps WHERE workflow_id = $1 ORDER BY sequence_order`, [req.params.id]);
    const { rows: recentExecs } = await db.query(`
      SELECT we.*, u.name AS triggered_by_name FROM workflow_executions we
      LEFT JOIN users u ON we.triggered_by = u.id
      WHERE we.workflow_id = $1 ORDER BY we.started_at DESC LIMIT 10
    `, [req.params.id]);

    res.json({ workflow: wfRows[0], steps, recentExecutions: recentExecs });
  } catch (err) {
    console.error('[WorkflowController] getById:', err);
    res.status(500).json({ message: 'Failed to fetch workflow' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, triggerType, triggerConditions, category } = req.body;
    if (!name) return res.status(400).json({ message: 'Workflow name is required' });
    const { rows } = await db.query(`
      INSERT INTO workflows (name, description, trigger_type, trigger_conditions, category, created_by)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [name, description || null, triggerType || 'manual', JSON.stringify(triggerConditions || {}), category || 'General', req.user.id]);
    res.status(201).json({ message: 'Workflow created', workflow: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Workflow with this name already exists' });
    console.error('[WorkflowController] create:', err);
    res.status(500).json({ message: 'Failed to create workflow' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, description, triggerType, triggerConditions, isActive, category } = req.body;
    const { rows } = await db.query(`
      UPDATE workflows SET name = COALESCE($1, name), description = COALESCE($2, description),
        trigger_type = COALESCE($3, trigger_type), trigger_conditions = COALESCE($4::jsonb, trigger_conditions),
        is_active = COALESCE($5, is_active), category = COALESCE($6, category),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 RETURNING *
    `, [name || null, description || null, triggerType || null,
        triggerConditions ? JSON.stringify(triggerConditions) : null,
        isActive !== undefined ? isActive : null, category || null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Workflow not found' });
    res.json({ message: 'Workflow updated', workflow: rows[0] });
  } catch (err) {
    console.error('[WorkflowController] update:', err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.delete = async (req, res) => {
  try {
    await db.query(`DELETE FROM workflows WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Workflow deleted' });
  } catch (err) {
    console.error('[WorkflowController] delete:', err);
    res.status(500).json({ message: 'Failed to delete workflow' });
  }
};

// Steps
exports.addStep = async (req, res) => {
  try {
    const { stepType, stepName, stepConfig, sequenceOrder, condition } = req.body;
    if (!stepType || !stepName) return res.status(400).json({ message: 'stepType and stepName are required' });
    const { rows } = await db.query(`
      INSERT INTO workflow_steps (workflow_id, step_type, step_name, step_config, sequence_order, condition)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [req.params.id, stepType, stepName, JSON.stringify(stepConfig || {}), sequenceOrder || 0, condition ? JSON.stringify(condition) : null]);
    res.status(201).json({ message: 'Step added', step: rows[0] });
  } catch (err) {
    console.error('[WorkflowController] addStep:', err);
    res.status(500).json({ message: 'Failed to add step' });
  }
};

exports.deleteStep = async (req, res) => {
  try {
    await db.query(`DELETE FROM workflow_steps WHERE id = $1 AND workflow_id = $2`, [req.params.stepId, req.params.id]);
    res.json({ message: 'Step deleted' });
  } catch (err) {
    console.error('[WorkflowController] deleteStep:', err);
    res.status(500).json({ message: 'Failed to delete step' });
  }
};

// Execute
exports.execute = async (req, res) => {
  try {
    const { triggerData } = req.body;
    const { rows } = await db.query(`SELECT * FROM workflows WHERE id = $1 AND is_active = TRUE`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Workflow not found or inactive' });

    const result = await workflowEngine.execute(req.params.id, triggerData || {}, req.user.id);
    res.json({ message: 'Workflow executed', result });
  } catch (err) {
    console.error('[WorkflowController] execute:', err);
    res.status(500).json({ message: 'Execution failed' });
  }
};

// Executions
exports.getExecutions = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT we.*, u.name AS triggered_by_name FROM workflow_executions we
      LEFT JOIN users u ON we.triggered_by = u.id
      WHERE we.workflow_id = $1
      ORDER BY we.started_at DESC LIMIT 20
    `, [req.params.id]);
    res.json({ executions: rows });
  } catch (err) {
    console.error('[WorkflowController] getExecutions:', err);
    res.status(500).json({ message: 'Failed to fetch executions' });
  }
};

exports.getExecutionLogs = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT wl.*, ws.step_name FROM workflow_logs wl
      LEFT JOIN workflow_steps ws ON wl.step_id = ws.id
      WHERE wl.execution_id = $1 ORDER BY wl.created_at
    `, [req.params.execId]);
    res.json({ logs: rows });
  } catch (err) {
    console.error('[WorkflowController] getExecutionLogs:', err);
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM workflows) AS total_workflows,
        (SELECT COUNT(*) FROM workflows WHERE is_active = TRUE) AS active_workflows,
        (SELECT COUNT(*) FROM workflow_executions) AS total_executions,
        (SELECT COUNT(*) FROM workflow_executions WHERE status='Completed') AS successful,
        (SELECT COUNT(*) FROM workflow_executions WHERE status='Failed') AS failed,
        (SELECT COUNT(*) FROM workflow_executions WHERE started_at > NOW() - INTERVAL '24 hours') AS last_24h
    `);
    res.json({ stats: rows[0] });
  } catch (err) {
    console.error('[WorkflowController] getStats:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
