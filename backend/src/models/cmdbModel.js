/**
 * cmdbModel.js — Configuration Management Database Model (Phase 17)
 */
const db = require('../config/db');

const CmdbModel = {
  async generateCiId(type) {
    const prefix = type ? type.substring(0,3).toUpperCase() : 'CI';
    const { rows } = await db.query(`SELECT COUNT(*) FROM configuration_items WHERE type = $1`, [type]);
    return `${prefix}-${String(parseInt(rows[0].count) + 1).padStart(6, '0')}`;
  },

  async getAll({ type, status, environment, search, limit = 50, offset = 0 } = {}) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (type) { where.push(`ci.type = $${i++}`); params.push(type); }
    if (status) { where.push(`ci.status = $${i++}`); params.push(status); }
    if (environment) { where.push(`ci.environment = $${i++}`); params.push(environment); }
    if (search) {
      where.push(`(ci.name ILIKE $${i} OR ci.ci_id ILIKE $${i} OR ci.hostname ILIKE $${i} OR ci.ip_address ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    params.push(limit, offset);
    const { rows } = await db.query(`
      SELECT ci.*, u.name AS owner_name
      FROM configuration_items ci
      LEFT JOIN users u ON ci.owner_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY ci.created_at DESC
      LIMIT $${i++} OFFSET $${i}
    `, params);
    return rows;
  },

  async count({ type, status, search } = {}) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (type) { where.push(`type = $${i++}`); params.push(type); }
    if (status) { where.push(`status = $${i++}`); params.push(status); }
    if (search) { where.push(`(name ILIKE $${i} OR ci_id ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const { rows } = await db.query(`SELECT COUNT(*) FROM configuration_items WHERE ${where.join(' AND ')}`, params);
    return parseInt(rows[0].count);
  },

  async findById(id) {
    const { rows } = await db.query(`
      SELECT ci.*, u.name AS owner_name FROM configuration_items ci
      LEFT JOIN users u ON ci.owner_id = u.id
      WHERE ci.id = $1
    `, [id]);
    return rows[0] || null;
  },

  async create(data) {
    const ciId = await this.generateCiId(data.type);
    const { rows } = await db.query(`
      INSERT INTO configuration_items (ci_id, name, type, subtype, status, environment, version,
        description, owner_id, attributes, ip_address, hostname, location, business_service)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *
    `, [
      ciId, data.name, data.type, data.subtype || null, data.status || 'Active',
      data.environment || 'Production', data.version || null, data.description || null,
      data.ownerId || null, data.attributes ? JSON.stringify(data.attributes) : '{}',
      data.ipAddress || null, data.hostname || null, data.location || null, data.businessService || null,
    ]);
    return rows[0];
  },

  async update(id, data) {
    const { rows } = await db.query(`
      UPDATE configuration_items SET
        name = COALESCE($1, name), subtype = COALESCE($2, subtype),
        status = COALESCE($3, status), environment = COALESCE($4, environment),
        version = COALESCE($5, version), description = COALESCE($6, description),
        owner_id = COALESCE($7, owner_id), ip_address = COALESCE($8, ip_address),
        hostname = COALESCE($9, hostname), location = COALESCE($10, location),
        business_service = COALESCE($11, business_service),
        attributes = COALESCE($12::jsonb, attributes), updated_at = CURRENT_TIMESTAMP
      WHERE id = $13 RETURNING *
    `, [
      data.name || null, data.subtype || null, data.status || null, data.environment || null,
      data.version || null, data.description || null, data.ownerId || null,
      data.ipAddress || null, data.hostname || null, data.location || null,
      data.businessService || null,
      data.attributes ? JSON.stringify(data.attributes) : null, id,
    ]);
    return rows[0] || null;
  },

  async getRelationships(ciId) {
    const { rows } = await db.query(`
      SELECT cr.*, src.name AS source_name, src.ci_id AS source_ci_id, src.type AS source_type,
             tgt.name AS target_name, tgt.ci_id AS target_ci_id, tgt.type AS target_type
      FROM ci_relationships cr
      JOIN configuration_items src ON cr.source_ci_id = src.id
      JOIN configuration_items tgt ON cr.target_ci_id = tgt.id
      WHERE cr.source_ci_id = $1 OR cr.target_ci_id = $1
    `, [ciId]);
    return rows;
  },

  async addRelationship({ sourceCiId, targetCiId, relationshipType, description, createdBy }) {
    const { rows } = await db.query(`
      INSERT INTO ci_relationships (source_ci_id, target_ci_id, relationship_type, description, created_by)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (source_ci_id, target_ci_id, relationship_type) DO NOTHING RETURNING *
    `, [sourceCiId, targetCiId, relationshipType || 'depends_on', description || null, createdBy || null]);
    return rows[0] || null;
  },

  async removeRelationship(id) {
    await db.query(`DELETE FROM ci_relationships WHERE id = $1`, [id]);
  },

  async getImpactAnalysis(ciId) {
    // Find all CIs that depend on this CI (impact chain)
    const { rows } = await db.query(`
      WITH RECURSIVE impact AS (
        SELECT cr.source_ci_id AS affected_id, 1 AS depth
        FROM ci_relationships cr WHERE cr.target_ci_id = $1
        UNION
        SELECT cr.source_ci_id, impact.depth + 1
        FROM ci_relationships cr
        JOIN impact ON impact.affected_id = cr.target_ci_id
        WHERE depth < 5
      )
      SELECT DISTINCT ci.id, ci.ci_id, ci.name, ci.type, ci.status, ci.business_service, impact.depth
      FROM impact
      JOIN configuration_items ci ON ci.id = impact.affected_id
      ORDER BY impact.depth
    `, [ciId]);
    return rows;
  },

  async addHistory({ ciId, action, performedBy, oldValue, newValue }) {
    const { rows } = await db.query(`
      INSERT INTO ci_history (ci_id, action, performed_by, old_value, new_value)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [ciId, action, performedBy, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null]);
    return rows[0];
  },

  async getHistory(ciId) {
    const { rows } = await db.query(`
      SELECT ch.*, u.name AS performed_by_name FROM ci_history ch
      LEFT JOIN users u ON ch.performed_by = u.id
      WHERE ch.ci_id = $1 ORDER BY ch.created_at DESC
    `, [ciId]);
    return rows;
  },

  async getStats() {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='Active') AS active,
        COUNT(*) FILTER (WHERE status='Inactive') AS inactive,
        COUNT(*) FILTER (WHERE status='Decommissioned') AS decommissioned,
        COUNT(DISTINCT type) AS unique_types,
        COUNT(DISTINCT environment) AS unique_environments,
        COUNT(DISTINCT business_service) FILTER (WHERE business_service IS NOT NULL) AS business_services
      FROM configuration_items
    `);
    return rows[0];
  },

  async getTypeDistribution() {
    const { rows } = await db.query(`
      SELECT type, COUNT(*) AS count FROM configuration_items GROUP BY type ORDER BY count DESC
    `);
    return rows;
  },
};

module.exports = CmdbModel;
