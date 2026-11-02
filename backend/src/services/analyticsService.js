/**
 * analyticsService.js — Enterprise Analytics (Phase 8)
 * All 16 metric categories with date range filtering.
 */

const db = require('../config/db');

const AnalyticsService = {

  async getOverview({ startDate, endDate } = {}) {
    const dateFilter = startDate && endDate
      ? `AND t.created_at BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    const [ticketStats, slaStats, aiStats] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) AS total_tickets,
          COUNT(*) FILTER (WHERE status IN ('Open','In Progress')) AS open_tickets,
          COUNT(*) FILTER (WHERE status = 'Resolved') AS resolved_tickets,
          COUNT(*) FILTER (WHERE status = 'Closed') AS closed_tickets,
          COUNT(*) FILTER (WHERE sla_breached = TRUE) AS sla_breaches,
          ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)::numeric, 2) AS avg_resolution_hours
        FROM tickets t WHERE 1=1 ${dateFilter}
      `),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE sla_breached = FALSE AND status IN ('Resolved','Closed')) AS sla_compliant,
          COUNT(*) FILTER (WHERE sla_breached = TRUE) AS sla_breached
        FROM tickets t WHERE 1=1 ${dateFilter}
      `),
      db.query(`
        SELECT
          ROUND(AVG(confidence)::numeric, 2) AS avg_ai_confidence,
          COUNT(*) AS total_predictions
        FROM ai_predictions
      `)
    ]);

    return {
      tickets: ticketStats.rows[0],
      sla: slaStats.rows[0],
      satisfaction: { avg_satisfaction: null, feedback_count: 0 },
      ai: aiStats.rows[0]
    };
  },

  async getTicketsByStatus({ startDate, endDate } = {}) {
    const dateFilter = startDate && endDate
      ? `AND created_at BETWEEN '${startDate}' AND '${endDate}'` : '';
    const { rows } = await db.query(`
      SELECT status, COUNT(*) AS count
      FROM tickets WHERE 1=1 ${dateFilter}
      GROUP BY status ORDER BY count DESC
    `);
    return rows;
  },

  async getTicketsByPriority({ startDate, endDate } = {}) {
    const dateFilter = startDate && endDate
      ? `AND created_at BETWEEN '${startDate}' AND '${endDate}'` : '';
    const { rows } = await db.query(`
      SELECT priority, COUNT(*) AS count
      FROM tickets WHERE 1=1 ${dateFilter}
      GROUP BY priority ORDER BY count DESC
    `);
    return rows;
  },

  async getTicketsByCategory({ startDate, endDate } = {}) {
    const dateFilter = startDate && endDate
      ? `AND t.created_at BETWEEN '${startDate}' AND '${endDate}'` : '';
    const { rows } = await db.query(`
      SELECT tc.name AS category, COUNT(t.id) AS count
      FROM tickets t
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      WHERE 1=1 ${dateFilter}
      GROUP BY tc.name ORDER BY count DESC
    `);
    return rows;
  },

  async getEngineerPerformance({ startDate, endDate } = {}) {
    const dateFilter = startDate && endDate
      ? `AND t.created_at BETWEEN '${startDate}' AND '${endDate}'` : '';
    const { rows } = await db.query(`
      SELECT
        u.name AS engineer,
        u.id AS engineer_id,
        COUNT(t.id) AS assigned_tickets,
        COUNT(t.id) FILTER (WHERE t.status IN ('Resolved','Closed')) AS resolved_tickets,
        COUNT(t.id) FILTER (WHERE t.sla_breached = TRUE) AS sla_breaches,
        ROUND(AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600)::numeric, 2) AS avg_resolution_hours
      FROM users u
      LEFT JOIN tickets t ON t.assigned_to = u.id
      WHERE 1=1 ${dateFilter}
      GROUP BY u.id, u.name
      HAVING COUNT(t.id) > 0
      ORDER BY resolved_tickets DESC
    `);
    return rows;
  },

  async getMonthlyTrends({ months = 12 } = {}) {
    const { rows } = await db.query(`
      SELECT
        TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('Resolved','Closed')) AS resolved,
        COUNT(*) FILTER (WHERE sla_breached = TRUE) AS sla_breaches
      FROM tickets
      WHERE created_at >= NOW() - ($1 || ' months')::interval
      GROUP BY date_trunc('month', created_at)
      ORDER BY month ASC
    `, [months]);
    return rows;
  },

  async getWeeklyTrends({ weeks = 12 } = {}) {
    const { rows } = await db.query(`
      SELECT
        TO_CHAR(date_trunc('week', created_at), 'YYYY-MM-DD') AS week,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status IN ('Resolved','Closed')) AS resolved
      FROM tickets
      WHERE created_at >= NOW() - ($1 || ' weeks')::interval
      GROUP BY date_trunc('week', created_at)
      ORDER BY week ASC
    `, [weeks]);
    return rows;
  },

  async getSlaCompliance({ startDate, endDate } = {}) {
    const dateFilter = startDate && endDate
      ? `AND created_at BETWEEN '${startDate}' AND '${endDate}'` : '';
    const { rows } = await db.query(`
      SELECT
        priority,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE sla_breached = FALSE) AS compliant,
        COUNT(*) FILTER (WHERE sla_breached = TRUE) AS breached,
        ROUND(100.0 * COUNT(*) FILTER (WHERE sla_breached = FALSE) / NULLIF(COUNT(*),0), 1) AS compliance_pct
      FROM tickets WHERE 1=1 ${dateFilter}
      GROUP BY priority ORDER BY priority
    `);
    return rows;
  },

  async getSupportWorkload() {
    const { rows } = await db.query(`
      SELECT
        u.name AS engineer,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('Resolved','Closed')) AS active_tickets,
        COUNT(t.id) FILTER (WHERE t.priority = 'Critical') AS critical_count,
        COUNT(t.id) FILTER (WHERE t.priority = 'High') AS high_count
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN tickets t ON t.assigned_to = u.id AND t.status NOT IN ('Resolved','Closed')
      WHERE r.name IN ('Support Engineer','Team Lead')
      GROUP BY u.id, u.name
      ORDER BY active_tickets DESC
    `);
    return rows;
  },

  async getAiPredictionAccuracy() {
    const { rows } = await db.query(`
      SELECT
        ap.predicted_category,
        COUNT(*) AS predictions,
        ROUND(AVG(ap.confidence)::numeric, 1) AS avg_confidence,
        COUNT(*) FILTER (WHERE t.category_id IS NOT NULL) AS matched
      FROM ai_predictions ap
      LEFT JOIN tickets t ON ap.ticket_id = t.id
      GROUP BY ap.predicted_category
      ORDER BY predictions DESC
    `);
    return rows;
  },

  async getKnowledgeBaseUsage() {
    const { rows } = await db.query(`
      SELECT category, COUNT(*) AS articles
      FROM knowledge_base
      GROUP BY category ORDER BY articles DESC
    `).catch(() => ({ rows: [] }));
    return rows;
  },

  /**
   * Export data as structured object (caller formats as CSV/Excel/PDF)
   */
  async getExportData(type = 'tickets', { startDate, endDate } = {}) {
    switch (type) {
      case 'tickets': {
        const dateFilter = startDate && endDate
          ? `AND t.created_at BETWEEN '${startDate}' AND '${endDate}'` : '';
        const { rows } = await db.query(`
          SELECT t.ticket_number, t.title, t.status, t.priority, t.created_at,
            t.updated_at, t.sla_breached,
            c.name AS category, u.name AS client, a.name AS assignee
          FROM tickets t
          LEFT JOIN ticket_categories c ON t.category_id = c.id
          LEFT JOIN users u ON t.created_by = u.id
          LEFT JOIN users a ON t.assigned_to = a.id
          WHERE 1=1 ${dateFilter}
          ORDER BY t.created_at DESC
        `);
        return rows;
      }
      case 'engineers':
        return this.getEngineerPerformance({ startDate, endDate });
      case 'sla':
        return this.getSlaCompliance({ startDate, endDate });
      default:
        return [];
    }
  }
};

module.exports = AnalyticsService;
