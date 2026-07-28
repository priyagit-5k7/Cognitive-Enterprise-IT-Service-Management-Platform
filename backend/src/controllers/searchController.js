/**
 * searchController.js — Global cross-entity search (Phase 11)
 */

const db = require('../config/db');

exports.globalSearch = async (req, res) => {
  try {
    const { q, type = 'all', page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const roleName = req.user.role_name;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const term = `%${q.trim()}%`;
    const results = {};

    // Search Tickets
    if (type === 'all' || type === 'tickets') {
      let ticketQuery = `
        SELECT t.id, t.ticket_number, t.title, t.status, t.priority, t.created_at,
          'ticket' AS entity_type,
          u.name AS client_name
        FROM tickets t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE (t.title ILIKE $1 OR t.description ILIKE $1 OR t.ticket_number ILIKE $1)
      `;
      const ticketParams = [term];
      if (roleName === 'Client') {
        ticketParams.push(userId);
        ticketQuery += ` AND t.created_by = $${ticketParams.length}`;
      }
      ticketQuery += ` ORDER BY t.created_at DESC LIMIT ${limit}`;
      const { rows: tickets } = await db.query(ticketQuery, ticketParams);
      results.tickets = tickets;
    }

    // Search Knowledge Base
    if (type === 'all' || type === 'knowledge') {
      const { rows: kb } = await db.query(`
        SELECT id, title, category, 'knowledge' AS entity_type, created_at
        FROM knowledge_base
        WHERE title ILIKE $1 OR problem ILIKE $1 OR solution ILIKE $1
        ORDER BY view_count DESC LIMIT ${limit}
      `, [term]);
      results.knowledge = kb;
    }

    // Search Users (admin/manager only)
    if ((type === 'all' || type === 'users') && ['Admin', 'Manager'].includes(roleName)) {
      const { rows: users } = await db.query(`
        SELECT u.id, u.name, u.email, r.name AS role, u.is_active, 'user' AS entity_type
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.deleted_at IS NULL AND (u.name ILIKE $1 OR u.email ILIKE $1)
        LIMIT ${limit}
      `, [term]);
      results.users = users;
    }

    // Search Comments (for ticket staff)
    if ((type === 'all' || type === 'comments') && roleName !== 'Client') {
      const { rows: comments } = await db.query(`
        SELECT tc.id, tc.comment, tc.created_at, tc.ticket_id,
          t.ticket_number, t.title AS ticket_title, u.name AS author,
          'comment' AS entity_type
        FROM ticket_comments tc
        JOIN tickets t ON tc.ticket_id = t.id
        JOIN users u ON tc.user_id = u.id
        WHERE tc.comment ILIKE $1
        ORDER BY tc.created_at DESC LIMIT ${limit}
      `, [term]);
      results.comments = comments;
    }

    // Save to recent searches
    setImmediate(async () => {
      try {
        await db.query(`
          INSERT INTO saved_searches (user_id, query, type, is_recent)
          VALUES ($1, $2, $3, TRUE)
          ON CONFLICT DO NOTHING
        `, [userId, q.trim(), type]);
      } catch (_) {}
    });

    const totalResults = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    res.json({ query: q, results, totalResults });
  } catch (err) {
    console.error('[Search] globalSearch:', err);
    res.status(500).json({ message: 'Search failed' });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ suggestions: [] });

    const term = `%${q.trim()}%`;
    const { rows: tickets } = await db.query(`
      SELECT ticket_number AS value, title AS label, 'ticket' AS type
      FROM tickets WHERE title ILIKE $1 OR ticket_number ILIKE $1
      LIMIT 5
    `, [term]);
    const { rows: kb } = await db.query(`
      SELECT id AS value, title AS label, 'knowledge' AS type
      FROM knowledge_base WHERE title ILIKE $1
      LIMIT 5
    `, [term]);

    res.json({ suggestions: [...tickets, ...kb] });
  } catch (err) {
    console.error('[Search] getSuggestions:', err);
    res.status(500).json({ message: 'Suggestions failed' });
  }
};

exports.getRecentSearches = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT DISTINCT query, type, MAX(created_at) AS last_used
      FROM saved_searches WHERE user_id = $1 AND is_recent = TRUE
      GROUP BY query, type
      ORDER BY last_used DESC LIMIT 10
    `, [req.user.id]).catch(() => ({ rows: [] }));
    res.json({ recent: rows });
  } catch (err) {
    res.json({ recent: [] });
  }
};

exports.getSavedSearches = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT * FROM saved_searches WHERE user_id = $1 AND is_recent = FALSE
      ORDER BY created_at DESC
    `, [req.user.id]).catch(() => ({ rows: [] }));
    res.json({ saved: rows });
  } catch (err) {
    res.json({ saved: [] });
  }
};

exports.saveSearch = async (req, res) => {
  try {
    const { query, type = 'all' } = req.body;
    if (!query) return res.status(400).json({ message: 'Query is required' });
    const { rows } = await db.query(`
      INSERT INTO saved_searches (user_id, query, type, is_recent)
      VALUES ($1, $2, $3, FALSE) RETURNING *
    `, [req.user.id, query, type]).catch(() => ({ rows: [] }));
    res.status(201).json({ message: 'Search saved', search: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save search' });
  }
};

exports.deleteSavedSearch = async (req, res) => {
  try {
    await db.query(
      `DELETE FROM saved_searches WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    ).catch(() => {});
    res.json({ message: 'Saved search deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete saved search' });
  }
};
