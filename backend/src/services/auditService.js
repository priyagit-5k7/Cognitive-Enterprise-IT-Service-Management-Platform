/**
 * auditService.js — Enterprise Audit Logging Service (Phase 22)
 * Non-blocking audit trail for all sensitive operations.
 */
const db = require('../config/db');

const AuditService = {
  async log({ userId, action, resourceType, resourceId, ipAddress, userAgent, requestMethod, requestPath, statusCode, details }) {
    try {
      await db.query(`
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, request_method, request_path, status_code, details)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [
        userId || null, action, resourceType || null, resourceId ? String(resourceId) : null,
        ipAddress || null, userAgent || null, requestMethod || null, requestPath || null,
        statusCode || null, details ? JSON.stringify(details) : null,
      ]);
    } catch (err) {
      // Never throw — audit logging must not break the main flow
      console.error('[AuditService] Failed to write audit log:', err.message);
    }
  },

  async logSecurityEvent({ eventType, severity, userId, ipAddress, description, metadata }) {
    try {
      await db.query(`
        INSERT INTO security_events (event_type, severity, user_id, ip_address, description, metadata)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [eventType, severity || 'medium', userId || null, ipAddress || null, description, JSON.stringify(metadata || {})]);
    } catch (err) {
      console.error('[AuditService] Failed to log security event:', err.message);
    }
  },

  async getLogs({ userId, action, resourceType, startDate, endDate, limit = 50, offset = 0 }) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (userId) { where.push(`al.user_id = $${i++}`); params.push(userId); }
    if (action) { where.push(`al.action ILIKE $${i++}`); params.push(`%${action}%`); }
    if (resourceType) { where.push(`al.resource_type = $${i++}`); params.push(resourceType); }
    if (startDate) { where.push(`al.created_at >= $${i++}`); params.push(startDate); }
    if (endDate) { where.push(`al.created_at <= $${i++}`); params.push(endDate); }
    params.push(limit, offset);
    const { rows } = await db.query(`
      SELECT al.*, u.name AS user_name, u.email AS user_email FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY al.created_at DESC
      LIMIT $${i++} OFFSET $${i}
    `, params);
    return rows;
  },

  async countLogs({ userId, action, resourceType, startDate, endDate }) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (userId) { where.push(`user_id = $${i++}`); params.push(userId); }
    if (action) { where.push(`action ILIKE $${i++}`); params.push(`%${action}%`); }
    if (resourceType) { where.push(`resource_type = $${i++}`); params.push(resourceType); }
    if (startDate) { where.push(`created_at >= $${i++}`); params.push(startDate); }
    if (endDate) { where.push(`created_at <= $${i++}`); params.push(endDate); }
    const { rows } = await db.query(`SELECT COUNT(*) FROM audit_logs WHERE ${where.join(' AND ')}`, params);
    return parseInt(rows[0].count);
  },

  async getSecurityEvents({ severity, eventType, isResolved, limit = 50, offset = 0 }) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (severity) { where.push(`severity = $${i++}`); params.push(severity); }
    if (eventType) { where.push(`event_type = $${i++}`); params.push(eventType); }
    if (isResolved !== undefined) { where.push(`is_resolved = $${i++}`); params.push(isResolved); }
    params.push(limit, offset);
    const { rows } = await db.query(`
      SELECT se.*, u.name AS user_name FROM security_events se
      LEFT JOIN users u ON se.user_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY se.created_at DESC
      LIMIT $${i++} OFFSET $${i}
    `, params);
    return rows;
  },

  async getSecurityStats() {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') AS audit_last_24h,
        (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '7 days') AS audit_last_7d,
        (SELECT COUNT(*) FROM security_events WHERE is_resolved = FALSE) AS open_events,
        (SELECT COUNT(*) FROM security_events WHERE severity = 'high' AND is_resolved = FALSE) AS high_severity_open,
        (SELECT COUNT(*) FROM security_events WHERE created_at > NOW() - INTERVAL '24 hours') AS events_last_24h,
        (SELECT COUNT(*) FROM user_sessions WHERE is_active = TRUE) AS active_sessions,
        (SELECT COUNT(*) FROM mfa_configs WHERE is_enabled = TRUE) AS mfa_enabled_users,
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_active_users
    `);
    return rows[0];
  },
};

/**
 * Express middleware to automatically audit all API requests
 */
AuditService.middleware = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    // Only audit state-changing operations or auth events
    const shouldAudit = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
      || req.path.includes('/auth/');
    if (!shouldAudit) return;

    AuditService.log({
      userId: req.user?.id || null,
      action: `${req.method} ${req.route?.path || req.path}`,
      resourceType: req.path.split('/')[3] || 'api',
      resourceId: req.params?.id || null,
      ipAddress: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      requestMethod: req.method,
      requestPath: req.originalUrl,
      statusCode: res.statusCode,
      details: { durationMs: Date.now() - start },
    });
  });
  next();
};

module.exports = AuditService;
