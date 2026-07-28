/**
 * problemModel.js — Problem Management Model (Phase 15)
 */
const db = require('../config/db');

const ProblemModel = {
  async generateProblemNumber() {
    const { rows } = await db.query(`SELECT COUNT(*) FROM problems`);
    return `PRB-${String(parseInt(rows[0].count) + 1).padStart(6, '0')}`;
  },

  async getAll({ status, priority, assignedTo, search, limit = 50, offset = 0 } = {}) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (status) { where.push(`p.status = $${i++}`); params.push(status); }
    if (priority) { where.push(`p.priority = $${i++}`); params.push(priority); }
    if (assignedTo) { where.push(`p.assigned_to = $${i++}`); params.push(assignedTo); }
    if (search) {
      where.push(`(p.title ILIKE $${i} OR p.problem_number ILIKE $${i} OR p.description ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    params.push(limit, offset);
    const { rows } = await db.query(`
      SELECT p.*, rb.name AS reported_by_name, at.name AS assigned_to_name,
             (SELECT COUNT(*) FROM incident_problem_mapping ipm WHERE ipm.problem_id = p.id) AS linked_incidents
      FROM problems p
      LEFT JOIN users rb ON p.reported_by = rb.id
      LEFT JOIN users at ON p.assigned_to = at.id
      WHERE ${where.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT $${i++} OFFSET $${i}
    `, params);
    return rows;
  },

  async count({ status, priority, search } = {}) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (status) { where.push(`status = $${i++}`); params.push(status); }
    if (priority) { where.push(`priority = $${i++}`); params.push(priority); }
    if (search) { where.push(`(title ILIKE $${i} OR problem_number ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const { rows } = await db.query(`SELECT COUNT(*) FROM problems WHERE ${where.join(' AND ')}`, params);
    return parseInt(rows[0].count);
  },

  async findById(id) {
    const { rows } = await db.query(`
      SELECT p.*, rb.name AS reported_by_name, at.name AS assigned_to_name
      FROM problems p
      LEFT JOIN users rb ON p.reported_by = rb.id
      LEFT JOIN users at ON p.assigned_to = at.id
      WHERE p.id = $1
    `, [id]);
    return rows[0] || null;
  },

  async create(data) {
    const problemNumber = await this.generateProblemNumber();
    const { rows } = await db.query(`
      INSERT INTO problems (problem_number, title, description, status, priority, category,
        root_cause, workaround, permanent_resolution, reported_by, assigned_to)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [
      problemNumber, data.title, data.description, data.status || 'Open',
      data.priority || 'Medium', data.category || null, data.rootCause || null,
      data.workaround || null, data.permanentResolution || null,
      data.reportedBy, data.assignedTo || null,
    ]);
    return rows[0];
  },

  async update(id, data) {
    const { rows } = await db.query(`
      UPDATE problems SET
        title = COALESCE($1, title), status = COALESCE($2, status), priority = COALESCE($3, priority),
        category = COALESCE($4, category), root_cause = COALESCE($5, root_cause),
        workaround = COALESCE($6, workaround), permanent_resolution = COALESCE($7, permanent_resolution),
        assigned_to = COALESCE($8, assigned_to),
        resolved_at = CASE WHEN $2 = 'Resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 RETURNING *
    `, [
      data.title || null, data.status || null, data.priority || null, data.category || null,
      data.rootCause || null, data.workaround || null, data.permanentResolution || null,
      data.assignedTo || null, id,
    ]);
    return rows[0] || null;
  },

  // Known Errors
  async getKnownErrors(problemId = null) {
    const where = problemId ? `WHERE ke.problem_id = $1` : ``;
    const params = problemId ? [problemId] : [];
    const { rows } = await db.query(`
      SELECT ke.*, p.problem_number, p.title AS problem_title, u.name AS created_by_name
      FROM known_errors ke
      LEFT JOIN problems p ON ke.problem_id = p.id
      LEFT JOIN users u ON ke.created_by = u.id
      ${where}
      ORDER BY ke.published_at DESC
    `, params);
    return rows;
  },

  async createKnownError({ problemId, title, description, workaround, affectedServices, createdBy }) {
    const { rows } = await db.query(`
      INSERT INTO known_errors (problem_id, title, description, workaround, affected_services, created_by)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [problemId, title, description, workaround, affectedServices || null, createdBy]);
    return rows[0];
  },

  // Incident linking
  async linkIncident({ problemId, ticketId, linkedBy }) {
    const { rows } = await db.query(`
      INSERT INTO incident_problem_mapping (problem_id, ticket_id, linked_by)
      VALUES ($1,$2,$3) ON CONFLICT (problem_id, ticket_id) DO NOTHING RETURNING *
    `, [problemId, ticketId, linkedBy]);
    return rows[0] || null;
  },

  async getLinkedIncidents(problemId) {
    const { rows } = await db.query(`
      SELECT t.id, t.ticket_number, t.title, t.status, t.priority, u.name AS requester_name
      FROM incident_problem_mapping ipm
      JOIN tickets t ON ipm.ticket_id = t.id
      JOIN users u ON t.created_by = u.id
      WHERE ipm.problem_id = $1
      ORDER BY t.created_at DESC
    `, [problemId]);
    return rows;
  },

  async addHistory({ problemId, action, performedBy, details }) {
    const { rows } = await db.query(`
      INSERT INTO problem_history (problem_id, action, performed_by, details)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [problemId, action, performedBy, details || null]);
    return rows[0];
  },

  async getHistory(problemId) {
    const { rows } = await db.query(`
      SELECT ph.*, u.name AS performed_by_name FROM problem_history ph
      LEFT JOIN users u ON ph.performed_by = u.id
      WHERE ph.problem_id = $1 ORDER BY ph.created_at DESC
    `, [problemId]);
    return rows;
  },

  async getStats() {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='Open') AS open,
        COUNT(*) FILTER (WHERE status='In Progress') AS in_progress,
        COUNT(*) FILTER (WHERE status='Known Error') AS known_error,
        COUNT(*) FILTER (WHERE status='Resolved') AS resolved,
        COUNT(*) FILTER (WHERE status='Closed') AS closed
      FROM problems
    `);
    return rows[0];
  },
};

module.exports = ProblemModel;
