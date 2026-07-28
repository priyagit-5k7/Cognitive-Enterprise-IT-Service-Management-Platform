/**
 * changeModel.js — ITIL Change Management Model (Phase 14)
 */
const db = require('../config/db');

const ChangeModel = {
  async generateChangeNumber() {
    const { rows } = await db.query(`SELECT COUNT(*) FROM change_requests`);
    const num = parseInt(rows[0].count) + 1;
    return `CHG-${String(num).padStart(6, '0')}`;
  },

  async getAll({ status, changeType, requestedBy, assignedTo, search, limit = 50, offset = 0 } = {}) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (status) { where.push(`cr.status = $${i++}`); params.push(status); }
    if (changeType) { where.push(`cr.change_type = $${i++}`); params.push(changeType); }
    if (requestedBy) { where.push(`cr.requested_by = $${i++}`); params.push(requestedBy); }
    if (assignedTo) { where.push(`cr.assigned_to = $${i++}`); params.push(assignedTo); }
    if (search) {
      where.push(`(cr.title ILIKE $${i} OR cr.change_number ILIKE $${i} OR cr.description ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    params.push(limit, offset);
    const { rows } = await db.query(`
      SELECT cr.*, rb.name AS requested_by_name, rb.email AS requested_by_email,
             at.name AS assigned_to_name
      FROM change_requests cr
      LEFT JOIN users rb ON cr.requested_by = rb.id
      LEFT JOIN users at ON cr.assigned_to = at.id
      WHERE ${where.join(' AND ')}
      ORDER BY cr.created_at DESC
      LIMIT $${i++} OFFSET $${i}
    `, params);
    return rows;
  },

  async count({ status, changeType, requestedBy, search } = {}) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (status) { where.push(`status = $${i++}`); params.push(status); }
    if (changeType) { where.push(`change_type = $${i++}`); params.push(changeType); }
    if (requestedBy) { where.push(`requested_by = $${i++}`); params.push(requestedBy); }
    if (search) { where.push(`(title ILIKE $${i} OR change_number ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const { rows } = await db.query(`SELECT COUNT(*) FROM change_requests WHERE ${where.join(' AND ')}`, params);
    return parseInt(rows[0].count);
  },

  async findById(id) {
    const { rows } = await db.query(`
      SELECT cr.*, rb.name AS requested_by_name, rb.email AS requested_by_email,
             at.name AS assigned_to_name, t.ticket_number AS linked_ticket_number
      FROM change_requests cr
      LEFT JOIN users rb ON cr.requested_by = rb.id
      LEFT JOIN users at ON cr.assigned_to = at.id
      LEFT JOIN tickets t ON cr.ticket_id = t.id
      WHERE cr.id = $1
    `, [id]);
    return rows[0] || null;
  },

  async create(data) {
    const changeNumber = await this.generateChangeNumber();
    const { rows } = await db.query(`
      INSERT INTO change_requests (
        change_number, title, description, change_type, status, priority, risk_level,
        risk_assessment, implementation_plan, rollback_plan, business_justification,
        requested_by, assigned_to, cab_required, planned_start, planned_end, ticket_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
    `, [
      changeNumber, data.title, data.description, data.changeType || 'Normal',
      data.status || 'Draft', data.priority || 'Medium', data.riskLevel || 'Low',
      data.riskAssessment || null, data.implementationPlan || null, data.rollbackPlan || null,
      data.businessJustification || null, data.requestedBy, data.assignedTo || null,
      data.cabRequired || false, data.plannedStart || null, data.plannedEnd || null, data.ticketId || null,
    ]);
    return rows[0];
  },

  async update(id, data) {
    const fields = [];
    const params = [];
    let i = 1;
    const allowed = [
      ['title','title'], ['description','description'], ['changeType','change_type'],
      ['status','status'], ['priority','priority'], ['riskLevel','risk_level'],
      ['riskAssessment','risk_assessment'], ['implementationPlan','implementation_plan'],
      ['rollbackPlan','rollback_plan'], ['businessJustification','business_justification'],
      ['assignedTo','assigned_to'], ['cabRequired','cab_required'],
      ['plannedStart','planned_start'], ['plannedEnd','planned_end'],
      ['actualStart','actual_start'], ['actualEnd','actual_end'], ['ticketId','ticket_id'],
    ];
    for (const [key, col] of allowed) {
      if (data[key] !== undefined) { fields.push(`${col} = $${i++}`); params.push(data[key]); }
    }
    if (!fields.length) return null;
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    const { rows } = await db.query(`UPDATE change_requests SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, params);
    return rows[0] || null;
  },

  // Tasks
  async getTasks(changeId) {
    const { rows } = await db.query(`
      SELECT ct.*, u.name AS assigned_to_name FROM change_tasks ct
      LEFT JOIN users u ON ct.assigned_to = u.id
      WHERE ct.change_id = $1 ORDER BY ct.sequence_order
    `, [changeId]);
    return rows;
  },

  async createTask({ changeId, title, description, assignedTo, sequenceOrder, estimatedHours }) {
    const { rows } = await db.query(`
      INSERT INTO change_tasks (change_id, title, description, assigned_to, sequence_order, estimated_hours)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [changeId, title, description || null, assignedTo || null, sequenceOrder || 0, estimatedHours || null]);
    return rows[0];
  },

  async updateTask(taskId, { status, actualHours }) {
    const { rows } = await db.query(`
      UPDATE change_tasks SET status = COALESCE($1, status), actual_hours = COALESCE($2, actual_hours),
      completed_at = CASE WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $3 RETURNING *
    `, [status || null, actualHours || null, taskId]);
    return rows[0] || null;
  },

  // Approvals
  async getApprovals(changeId) {
    const { rows } = await db.query(`
      SELECT ca.*, u.name AS approver_name, u.email AS approver_email FROM change_approvals ca
      LEFT JOIN users u ON ca.approver_id = u.id
      WHERE ca.change_id = $1 ORDER BY ca.sequence_order
    `, [changeId]);
    return rows;
  },

  async addApprover({ changeId, approverId, sequenceOrder }) {
    const { rows } = await db.query(`
      INSERT INTO change_approvals (change_id, approver_id, sequence_order)
      VALUES ($1,$2,$3) RETURNING *
    `, [changeId, approverId, sequenceOrder || 0]);
    return rows[0];
  },

  async submitApproval({ approvalId, approverId, status, comments }) {
    const { rows } = await db.query(`
      UPDATE change_approvals SET status = $1, comments = $2, approved_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND approver_id = $4 RETURNING *
    `, [status, comments || null, approvalId, approverId]);
    return rows[0] || null;
  },

  // History
  async addHistory({ changeId, action, performedBy, oldValue, newValue }) {
    const { rows } = await db.query(`
      INSERT INTO change_history (change_id, action, performed_by, old_value, new_value)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [changeId, action, performedBy, oldValue || null, newValue || null]);
    return rows[0];
  },

  async getHistory(changeId) {
    const { rows } = await db.query(`
      SELECT ch.*, u.name AS performed_by_name FROM change_history ch
      LEFT JOIN users u ON ch.performed_by = u.id
      WHERE ch.change_id = $1 ORDER BY ch.created_at DESC
    `, [changeId]);
    return rows;
  },

  async getStats() {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='Draft') AS draft,
        COUNT(*) FILTER (WHERE status='Submitted') AS submitted,
        COUNT(*) FILTER (WHERE status='Approved') AS approved,
        COUNT(*) FILTER (WHERE status='In Progress') AS in_progress,
        COUNT(*) FILTER (WHERE status='Completed') AS completed,
        COUNT(*) FILTER (WHERE status='Rejected') AS rejected,
        COUNT(*) FILTER (WHERE change_type='Emergency') AS emergency,
        COUNT(*) FILTER (WHERE risk_level='High' OR risk_level='Critical') AS high_risk
      FROM change_requests
    `);
    return rows[0];
  },
};

module.exports = ChangeModel;
