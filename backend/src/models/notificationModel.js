/**
 * notificationModel.js — Full DB model for notifications (Phase 7)
 */

const db = require('../config/db');

const NotificationModel = {
  async create({ userId, title, message, type = 'info', priority = 'normal', ticketId = null, link = null }) {
    const { rows } = await db.query(
      `INSERT INTO notifications (user_id, title, message, type, priority, ticket_id, link)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, title, message, type, priority, ticketId, link]
    );
    return rows[0];
  },

  async findByUser(userId, { unreadOnly = false, limit = 50, offset = 0 } = {}) {
    let query = `SELECT * FROM notifications WHERE user_id = $1`;
    const params = [userId];
    if (unreadOnly) {
      query += ` AND is_read = FALSE`;
    }
    query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    params.push(limit, offset);
    const { rows } = await db.query(query, params);
    return rows;
  },

  async countUnread(userId) {
    const { rows } = await db.query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(rows[0].count, 10);
  },

  async markRead(id, userId) {
    const { rows } = await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    return rows[0] || null;
  },

  async markAllRead(userId) {
    const { rowCount } = await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return rowCount;
  },

  async delete(id, userId) {
    const { rowCount } = await db.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rowCount > 0;
  },

  async deleteAll(userId) {
    const { rowCount } = await db.query(
      `DELETE FROM notifications WHERE user_id = $1`,
      [userId]
    );
    return rowCount;
  }
};

module.exports = NotificationModel;
