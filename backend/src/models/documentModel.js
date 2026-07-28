/**
 * documentModel.js — Enterprise Document Management Model (Phase 12)
 */
const db = require('../config/db');

const DocumentModel = {
  // Get all documents with filters
  async getAll({ uploadedBy, categoryId, folderPath, search, isDeleted = false, limit = 50, offset = 0 } = {}) {
    let where = [`d.is_deleted = $1`];
    const params = [isDeleted];
    let i = 2;
    if (uploadedBy) { where.push(`d.uploaded_by = $${i++}`); params.push(uploadedBy); }
    if (categoryId) { where.push(`d.category_id = $${i++}`); params.push(categoryId); }
    if (folderPath) { where.push(`d.folder_path = $${i++}`); params.push(folderPath); }
    if (search) {
      where.push(`(d.file_name ILIKE $${i} OR d.description ILIKE $${i} OR $${i} = ANY(d.tags))`);
      params.push(`%${search}%`); i++;
    }
    params.push(limit, offset);
    const { rows } = await db.query(`
      SELECT d.*, u.name AS uploaded_by_name, dc.name AS category_name, dc.color AS category_color, dc.icon AS category_icon
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      WHERE ${where.join(' AND ')}
      ORDER BY d.created_at DESC
      LIMIT $${i++} OFFSET $${i}
    `, params);
    return rows;
  },

  async countAll({ uploadedBy, categoryId, folderPath, search, isDeleted = false } = {}) {
    let where = [`d.is_deleted = $1`];
    const params = [isDeleted];
    let i = 2;
    if (uploadedBy) { where.push(`d.uploaded_by = $${i++}`); params.push(uploadedBy); }
    if (categoryId) { where.push(`d.category_id = $${i++}`); params.push(categoryId); }
    if (folderPath) { where.push(`d.folder_path = $${i++}`); params.push(folderPath); }
    if (search) {
      where.push(`(d.file_name ILIKE $${i} OR d.description ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    const { rows } = await db.query(`SELECT COUNT(*) FROM documents d WHERE ${where.join(' AND ')}`, params);
    return parseInt(rows[0].count);
  },

  async findById(id) {
    const { rows } = await db.query(`
      SELECT d.*, u.name AS uploaded_by_name, dc.name AS category_name, dc.color AS category_color
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      WHERE d.id = $1 AND d.is_deleted = FALSE
    `, [id]);
    return rows[0] || null;
  },

  async findByChecksum(checksum) {
    const { rows } = await db.query(
      `SELECT id, file_name FROM documents WHERE checksum = $1 AND is_deleted = FALSE LIMIT 1`,
      [checksum]
    );
    return rows[0] || null;
  },

  async create({ ticketId, uploadedBy, fileName, filePath, mimeType, fileSize, checksum, categoryId, description, folderPath, tags, metadata, version = 1 }) {
    const { rows } = await db.query(`
      INSERT INTO documents (ticket_id, uploaded_by, file_name, file_path, mime_type, file_size, checksum, category_id, description, folder_path, tags, metadata, version)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [ticketId || null, uploadedBy, fileName, filePath, mimeType, fileSize, checksum, categoryId || null, description || null, folderPath || '/', tags || [], metadata || {}, version]);
    return rows[0];
  },

  async update(id, updates) {
    const fields = [];
    const params = [];
    let i = 1;
    const allowed = ['category_id', 'description', 'folder_path', 'tags', 'metadata', 'file_name'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        params.push(updates[key]);
      }
    }
    if (!fields.length) return null;
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    const { rows } = await db.query(
      `UPDATE documents SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      params
    );
    return rows[0] || null;
  },

  async softDelete(id, deletedBy) {
    const { rows } = await db.query(
      `UPDATE documents SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [id]
    );
    return rows[0] || null;
  },

  async incrementDownload(id) {
    await db.query(`UPDATE documents SET download_count = download_count + 1 WHERE id = $1`, [id]);
  },

  // Versions
  async createVersion({ documentId, versionNumber, filePath, fileSize, checksum, uploadedBy, changeNotes }) {
    const { rows } = await db.query(`
      INSERT INTO document_versions (document_id, version_number, file_path, file_size, checksum, uploaded_by, change_notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [documentId, versionNumber, filePath, fileSize, checksum, uploadedBy, changeNotes || null]);
    return rows[0];
  },

  async getVersions(documentId) {
    const { rows } = await db.query(`
      SELECT dv.*, u.name AS uploaded_by_name
      FROM document_versions dv
      LEFT JOIN users u ON dv.uploaded_by = u.id
      WHERE dv.document_id = $1
      ORDER BY dv.version_number DESC
    `, [documentId]);
    return rows;
  },

  // History
  async addHistory({ documentId, action, performedBy, details }) {
    const { rows } = await db.query(`
      INSERT INTO document_history (document_id, action, performed_by, details)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [documentId, action, performedBy, details ? JSON.stringify(details) : null]);
    return rows[0];
  },

  async getHistory(documentId) {
    const { rows } = await db.query(`
      SELECT dh.*, u.name AS performed_by_name
      FROM document_history dh
      LEFT JOIN users u ON dh.performed_by = u.id
      WHERE dh.document_id = $1
      ORDER BY dh.created_at DESC
    `, [documentId]);
    return rows;
  },

  // Categories
  async getAllCategories() {
    const { rows } = await db.query(`SELECT * FROM document_categories ORDER BY name`);
    return rows;
  },

  async createCategory({ name, description, icon, color, parentId }) {
    const { rows } = await db.query(`
      INSERT INTO document_categories (name, description, icon, color, parent_id)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [name, description || null, icon || 'Folder', color || '#6366F1', parentId || null]);
    return rows[0];
  },

  // Storage analytics
  async getStorageStats(userId = null) {
    const params = userId ? [userId] : [];
    const userFilter = userId ? 'WHERE d.uploaded_by = $1 AND' : 'WHERE';
    const { rows } = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE d.is_deleted = FALSE) AS total_files,
        COALESCE(SUM(d.file_size) FILTER (WHERE d.is_deleted = FALSE), 0) AS total_size_bytes,
        COUNT(DISTINCT d.category_id) FILTER (WHERE d.is_deleted = FALSE) AS total_categories,
        SUM(d.download_count) AS total_downloads,
        COUNT(*) FILTER (WHERE d.is_deleted = TRUE) AS deleted_files
      FROM documents d
      ${userId ? 'WHERE d.uploaded_by = $1' : ''}
    `, params);
    return rows[0];
  },

  async getStorageByCategory() {
    const { rows } = await db.query(`
      SELECT 
        dc.name AS category_name, dc.color, dc.icon,
        COUNT(d.id) FILTER (WHERE d.is_deleted = FALSE) AS file_count,
        COALESCE(SUM(d.file_size) FILTER (WHERE d.is_deleted = FALSE), 0) AS total_size
      FROM document_categories dc
      LEFT JOIN documents d ON d.category_id = dc.id
      GROUP BY dc.id, dc.name, dc.color, dc.icon
      ORDER BY total_size DESC
    `);
    return rows;
  },
};

module.exports = DocumentModel;
