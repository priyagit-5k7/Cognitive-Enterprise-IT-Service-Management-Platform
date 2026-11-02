/**
 * monitoringController.js — System Health & Monitoring Controller (Phase 23)
 */
const os = require('os');
const db = require('../config/db');

exports.getSystemHealth = async (req, res) => {
  try {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // DB ping
    let dbHealthy = false;
    let dbLatency = null;
    try {
      const start = Date.now();
      await db.query('SELECT 1');
      dbLatency = Date.now() - start;
      dbHealthy = true;
    } catch { }

    const health = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      uptimeFormatted: formatDuration(uptime),
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        memoryUsedMB: Math.round(memUsage.rss / 1024 / 1024),
        memoryHeapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryHeapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
      system: {
        platform: os.platform(),
        cpus: os.cpus().length,
        loadAverage: loadAvg.map(l => parseFloat(l.toFixed(2))),
        totalMemoryMB: Math.round(totalMem / 1024 / 1024),
        freeMemoryMB: Math.round(freeMem / 1024 / 1024),
        memoryUsagePercent: Math.round((1 - freeMem / totalMem) * 100),
      },
      database: {
        healthy: dbHealthy,
        latencyMs: dbLatency,
      },
    };

    res.json(health);
  } catch (err) {
    console.error('[MonitoringController] getSystemHealth:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getMetrics = async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    const intervalMap = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days', '30d': '30 days' };
    const interval = intervalMap[period] || '24 hours';

    const { rows: ticketMetrics } = await db.query(`
      SELECT
        COUNT(*) AS total_tickets,
        COUNT(*) FILTER (WHERE status='Open') AS open_tickets,
        COUNT(*) FILTER (WHERE status='Resolved') AS resolved_tickets,
        COUNT(*) FILTER (WHERE status='Closed') AS closed_tickets,
        COUNT(*) FILTER (WHERE priority='Critical' OR priority='High') AS high_priority,
        ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600)::numeric, 2) AS avg_resolution_hours
      FROM tickets WHERE created_at > NOW() - INTERVAL '${interval}'
    `);

    const { rows: userMetrics } = await db.query(`
      SELECT COUNT(DISTINCT user_id) AS active_users FROM audit_logs
      WHERE created_at > NOW() - INTERVAL '${interval}'
    `);

    let aiMetrics = [{ total_ai_calls: '0', avg_latency_ms: null, total_tokens: '0', successful_calls: '0' }];
    try {
      const { rows } = await db.query(`
        SELECT
          COUNT(*) AS total_ai_calls,
          AVG(latency_ms) AS avg_latency_ms,
          SUM(tokens_used) AS total_tokens,
          COUNT(*) FILTER (WHERE success=TRUE) AS successful_calls
        FROM ai_performance_metrics WHERE created_at > NOW() - INTERVAL '${interval}'
      `);
      aiMetrics = rows;
    } catch (aiErr) {
      console.warn('[MonitoringController] ai_performance_metrics query failed (non-fatal):', aiErr.message);
    }

    const { rows: hourlyTickets } = await db.query(`
      SELECT DATE_TRUNC('hour', created_at) AS hour, COUNT(*) AS count
      FROM tickets WHERE created_at > NOW() - INTERVAL '${interval}'
      GROUP BY hour ORDER BY hour
    `);

    res.json({
      period,
      tickets: ticketMetrics[0],
      users: userMetrics[0],
      ai: aiMetrics[0],
      hourlyTickets,
    });
  } catch (err) {
    console.error('[MonitoringController] getMetrics:', err);
    res.status(500).json({ message: 'Failed to fetch metrics' });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    // system_health_logs is used since system_alerts table is not in the schema
    const { rows } = await db.query(`
      SELECT id, component AS alert_type, status AS severity,
             details::text AS message, created_at, NULL AS resolved_at, FALSE AS is_resolved
      FROM system_health_logs
      ORDER BY created_at DESC LIMIT 50
    `);
    res.json({ alerts: rows });
  } catch (err) {
    console.error('[MonitoringController] getAlerts:', err);
    res.status(500).json({ message: 'Failed to fetch alerts' });
  }
};

exports.createAlert = async (req, res) => {
  try {
    const { alertType, message, severity, metadata } = req.body;
    if (!alertType || !message) return res.status(400).json({ message: 'alertType and message are required' });
    const { rows } = await db.query(`
      INSERT INTO system_alerts (alert_type, message, severity, metadata)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [alertType, message, severity || 'info', JSON.stringify(metadata || {})]);
    res.status(201).json({ alert: rows[0] });
  } catch (err) {
    console.error('[MonitoringController] createAlert:', err);
    res.status(500).json({ message: 'Failed to create alert' });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const { rows } = await db.query(`
      UPDATE system_alerts SET is_resolved=TRUE, resolved_at=CURRENT_TIMESTAMP, resolved_by=$1
      WHERE id=$2 RETURNING *
    `, [req.user.id, req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Alert not found' });
    res.json({ message: 'Alert resolved', alert: rows[0] });
  } catch (err) {
    console.error('[MonitoringController] resolveAlert:', err);
    res.status(500).json({ message: 'Failed to resolve alert' });
  }
};

exports.getDatabaseStats = async (req, res) => {
  try {
    const tableStats = await Promise.all([
      db.query(`SELECT COUNT(*) AS count FROM tickets`),
      db.query(`SELECT COUNT(*) AS count FROM users`),
      db.query(`SELECT COUNT(*) AS count FROM knowledge_base`),
      db.query(`SELECT COUNT(*) AS count FROM documents`),
      db.query(`SELECT COUNT(*) AS count FROM assets`),
      db.query(`SELECT COUNT(*) AS count FROM change_requests`),
      db.query(`SELECT COUNT(*) AS count FROM problems`),
      db.query(`SELECT COUNT(*) AS count FROM releases`),
      db.query(`SELECT COUNT(*) AS count FROM configuration_items`),
    ]);

    const tables = ['tickets', 'users', 'knowledge_base', 'documents', 'assets', 'change_requests', 'problems', 'releases', 'configuration_items'];
    const stats = {};
    tables.forEach((table, i) => { stats[table] = parseInt(tableStats[i].rows[0].count); });

    // DB size estimate
    let dbSizeResult = null;
    try {
      const { rows } = await db.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size, pg_database_size(current_database()) AS size_bytes`);
      dbSizeResult = rows[0];
    } catch { }

    res.json({ tables: stats, database: dbSizeResult });
  } catch (err) {
    console.error('[MonitoringController] getDatabaseStats:', err);
    res.status(500).json({ message: 'Failed to fetch database stats' });
  }
};

exports.healthCheck = async (req, res) => {
  // Public endpoint for load balancers and uptime monitors
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unavailable', timestamp: new Date().toISOString() });
  }
};

function formatDuration(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}
