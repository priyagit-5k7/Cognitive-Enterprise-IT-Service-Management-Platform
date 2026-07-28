/**
 * releaseModel.js — Release Management Model (Phase 16)
 */
const db = require('../config/db');

const ReleaseModel = {
  async generateReleaseNumber() {
    const { rows } = await db.query(`SELECT COUNT(*) FROM releases`);
    return `REL-${String(parseInt(rows[0].count) + 1).padStart(6, '0')}`;
  },

  async getAll({ status, releaseType, environment, search, limit = 50, offset = 0 } = {}) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (status) { where.push(`r.status = $${i++}`); params.push(status); }
    if (releaseType) { where.push(`r.release_type = $${i++}`); params.push(releaseType); }
    if (environment) { where.push(`r.environment = $${i++}`); params.push(environment); }
    if (search) {
      where.push(`(r.title ILIKE $${i} OR r.release_number ILIKE $${i} OR r.version ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    params.push(limit, offset);
    const { rows } = await db.query(`
      SELECT r.*, cb.name AS created_by_name, ab.name AS approved_by_name,
             (SELECT COUNT(*) FROM release_tasks rt WHERE rt.release_id = r.id) AS task_count,
             (SELECT COUNT(*) FROM release_tasks rt WHERE rt.release_id = r.id AND rt.status = 'Completed') AS completed_tasks
      FROM releases r
      LEFT JOIN users cb ON r.created_by = cb.id
      LEFT JOIN users ab ON r.approved_by = ab.id
      WHERE ${where.join(' AND ')}
      ORDER BY r.created_at DESC
      LIMIT $${i++} OFFSET $${i}
    `, params);
    return rows;
  },

  async count({ status, releaseType, search } = {}) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (status) { where.push(`status = $${i++}`); params.push(status); }
    if (releaseType) { where.push(`release_type = $${i++}`); params.push(releaseType); }
    if (search) { where.push(`(title ILIKE $${i} OR release_number ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const { rows } = await db.query(`SELECT COUNT(*) FROM releases WHERE ${where.join(' AND ')}`, params);
    return parseInt(rows[0].count);
  },

  async findById(id) {
    const { rows } = await db.query(`
      SELECT r.*, cb.name AS created_by_name, ab.name AS approved_by_name
      FROM releases r
      LEFT JOIN users cb ON r.created_by = cb.id
      LEFT JOIN users ab ON r.approved_by = ab.id
      WHERE r.id = $1
    `, [id]);
    return rows[0] || null;
  },

  async create(data) {
    const releaseNumber = await this.generateReleaseNumber();
    const { rows } = await db.query(`
      INSERT INTO releases (release_number, title, description, version, release_type, status, environment,
        planned_date, rollback_plan, release_notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [
      releaseNumber, data.title, data.description || null, data.version,
      data.releaseType || 'Minor', data.status || 'Planning', data.environment || 'Production',
      data.plannedDate || null, data.rollbackPlan || null, data.releaseNotes || null, data.createdBy,
    ]);
    return rows[0];
  },

  async update(id, data) {
    const { rows } = await db.query(`
      UPDATE releases SET
        title = COALESCE($1, title), description = COALESCE($2, description),
        version = COALESCE($3, version), release_type = COALESCE($4, release_type),
        status = COALESCE($5, status), environment = COALESCE($6, environment),
        planned_date = COALESCE($7, planned_date), actual_date = COALESCE($8, actual_date),
        rollback_plan = COALESCE($9, rollback_plan), release_notes = COALESCE($10, release_notes),
        approved_by = COALESCE($11, approved_by), updated_at = CURRENT_TIMESTAMP
      WHERE id = $12 RETURNING *
    `, [
      data.title || null, data.description || null, data.version || null,
      data.releaseType || null, data.status || null, data.environment || null,
      data.plannedDate || null, data.actualDate || null, data.rollbackPlan || null,
      data.releaseNotes || null, data.approvedBy || null, id,
    ]);
    return rows[0] || null;
  },

  async getTasks(releaseId) {
    const { rows } = await db.query(`
      SELECT rt.*, u.name AS assigned_to_name FROM release_tasks rt
      LEFT JOIN users u ON rt.assigned_to = u.id
      WHERE rt.release_id = $1 ORDER BY rt.sequence_order
    `, [releaseId]);
    return rows;
  },

  async createTask({ releaseId, title, description, assignedTo, sequenceOrder }) {
    const { rows } = await db.query(`
      INSERT INTO release_tasks (release_id, title, description, assigned_to, sequence_order)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [releaseId, title, description || null, assignedTo || null, sequenceOrder || 0]);
    return rows[0];
  },

  async updateTask(taskId, { status }) {
    const { rows } = await db.query(`
      UPDATE release_tasks SET status = $1,
        completed_at = CASE WHEN $1 = 'Completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $2 RETURNING *
    `, [status, taskId]);
    return rows[0] || null;
  },

  async addHistory({ releaseId, action, performedBy, details }) {
    const { rows } = await db.query(`
      INSERT INTO release_history (release_id, action, performed_by, details)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [releaseId, action, performedBy, details || null]);
    return rows[0];
  },

  async getHistory(releaseId) {
    const { rows } = await db.query(`
      SELECT rh.*, u.name AS performed_by_name FROM release_history rh
      LEFT JOIN users u ON rh.performed_by = u.id
      WHERE rh.release_id = $1 ORDER BY rh.created_at DESC
    `, [releaseId]);
    return rows;
  },

  async getStats() {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='Planning') AS planning,
        COUNT(*) FILTER (WHERE status='Ready') AS ready,
        COUNT(*) FILTER (WHERE status='Deployed') AS deployed,
        COUNT(*) FILTER (WHERE status='Rolled Back') AS rolled_back,
        COUNT(*) FILTER (WHERE planned_date BETWEEN NOW() AND NOW() + INTERVAL '7 days') AS upcoming_week
      FROM releases
    `);
    return rows[0];
  },
};

module.exports = ReleaseModel;
