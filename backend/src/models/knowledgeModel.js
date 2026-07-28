/**
 * knowledgeModel.js — Knowledge Base DB model (Phase 9)
 */

const db = require('../config/db');

const KnowledgeModel = {
  async create({ title, category, problem, solution, keywords = [], tags = [], createdBy }) {
    const { rows } = await db.query(`
      INSERT INTO knowledge_base (title, category, problem, solution, keywords, tags, created_by, version)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
      RETURNING *
    `, [title, category, problem, solution, keywords, tags, createdBy]);
    return rows[0];
  },

  async findAll({ search, category, page = 1, limit = 20, isApproved } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (kb.title ILIKE $${params.length} OR kb.problem ILIKE $${params.length} OR kb.solution ILIKE $${params.length})`;
    }
    if (category) {
      params.push(category);
      where += ` AND kb.category = $${params.length}`;
    }
    if (isApproved !== undefined) {
      params.push(isApproved);
      where += ` AND kb.is_approved = $${params.length}`;
    }

    params.push(limit, offset);
    const { rows } = await db.query(`
      SELECT kb.*, u.name AS created_by_name
      FROM knowledge_base kb
      LEFT JOIN users u ON kb.created_by = u.id
      ${where}
      ORDER BY kb.view_count DESC, kb.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, -2);
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) FROM knowledge_base kb ${where}`, countParams
    );

    return { articles: rows, total: parseInt(countRows[0].count, 10) };
  },

  async findById(id) {
    const { rows } = await db.query(`
      SELECT kb.*, u.name AS created_by_name, u2.name AS updated_by_name
      FROM knowledge_base kb
      LEFT JOIN users u ON kb.created_by = u.id
      LEFT JOIN users u2 ON kb.updated_by = u2.id
      WHERE kb.id = $1
    `, [id]);
    return rows[0] || null;
  },

  async update(id, { title, category, problem, solution, keywords, tags, updatedBy }) {
    const { rows } = await db.query(`
      UPDATE knowledge_base
      SET title = COALESCE($1, title),
          category = COALESCE($2, category),
          problem = COALESCE($3, problem),
          solution = COALESCE($4, solution),
          keywords = COALESCE($5, keywords),
          tags = COALESCE($6, tags),
          updated_by = $7,
          version = version + 1,
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [title, category, problem, solution, keywords, tags, updatedBy, id]);
    return rows[0] || null;
  },

  async incrementViewCount(id) {
    await db.query(
      `UPDATE knowledge_base SET view_count = view_count + 1 WHERE id = $1`, [id]
    );
  },

  async approve(id, approvedBy) {
    const { rows } = await db.query(`
      UPDATE knowledge_base SET is_approved = TRUE, updated_by = $2, updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [id, approvedBy]);
    return rows[0] || null;
  },

  async delete(id) {
    const { rowCount } = await db.query(`DELETE FROM knowledge_base WHERE id = $1`, [id]);
    return rowCount > 0;
  },

  async getCategories() {
    const { rows } = await db.query(`
      SELECT category, COUNT(*) AS article_count
      FROM knowledge_base
      GROUP BY category ORDER BY article_count DESC
    `);
    return rows;
  },

  async fullTextSearch(query, limit = 10) {
    const { rows } = await db.query(`
      SELECT kb.*, u.name AS created_by_name,
        ts_rank(to_tsvector('english', kb.title || ' ' || kb.problem || ' ' || kb.solution),
                plainto_tsquery('english', $1)) AS rank
      FROM knowledge_base kb
      LEFT JOIN users u ON kb.created_by = u.id
      WHERE to_tsvector('english', kb.title || ' ' || kb.problem || ' ' || kb.solution)
        @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC LIMIT $2
    `, [query, limit]).catch(() => ({ rows: [] }));
    return rows;
  }
};

module.exports = KnowledgeModel;
