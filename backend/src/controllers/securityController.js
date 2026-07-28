/**
 * securityController.js — Enterprise Security Management Controller (Phase 22)
 */
const db = require('../config/db');
const AuditService = require('../services/auditService');
const MfaService = require('../services/mfaService');

// ─── MFA ───────────────────────────────────────────────────────────────────────

exports.getMfaStatus = async (req, res) => {
  try {
    const config = await MfaService.getMfaConfig(req.user.id);
    res.json({
      mfaEnabled: config?.is_enabled || false,
      mfaSetup: !!config,
      backupCodesRemaining: config?.backup_codes?.length || 0,
      method: config?.method || null,
      verifiedAt: config?.verified_at || null,
    });
  } catch (err) {
    console.error('[SecurityController] getMfaStatus:', err);
    res.status(500).json({ message: 'Failed to get MFA status' });
  }
};

exports.setupMfa = async (req, res) => {
  try {
    const { secret, backupCodes } = await MfaService.setupMfa(req.user.id);
    const { rows } = await db.query(`SELECT email, name FROM users WHERE id = $1`, [req.user.id]);
    const user = rows[0];

    // Generate TOTP URI for QR code display
    const issuer = encodeURIComponent('SmartSupportDesk');
    const account = encodeURIComponent(user.email);
    const totpUri = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;

    await AuditService.log({ userId: req.user.id, action: 'mfa_setup_initiated', resourceType: 'mfa' });

    res.json({ secret, backupCodes, totpUri, message: 'Scan the QR code or enter the secret key in your authenticator app' });
  } catch (err) {
    console.error('[SecurityController] setupMfa:', err);
    res.status(500).json({ message: 'Failed to setup MFA' });
  }
};

exports.enableMfa = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Verification token is required' });
    const result = await MfaService.enableMfa(req.user.id, token);
    if (!result.success) return res.status(400).json({ message: result.message });
    await AuditService.log({ userId: req.user.id, action: 'mfa_enabled', resourceType: 'mfa' });
    await AuditService.logSecurityEvent({ eventType: 'mfa_enabled', severity: 'low', userId: req.user.id, description: 'User enabled MFA' });
    res.json({ message: 'MFA enabled successfully' });
  } catch (err) {
    console.error('[SecurityController] enableMfa:', err);
    res.status(500).json({ message: 'Failed to enable MFA' });
  }
};

exports.disableMfa = async (req, res) => {
  try {
    await MfaService.disableMfa(req.user.id);
    await AuditService.log({ userId: req.user.id, action: 'mfa_disabled', resourceType: 'mfa' });
    await AuditService.logSecurityEvent({ eventType: 'mfa_disabled', severity: 'medium', userId: req.user.id, description: 'User disabled MFA' });
    res.json({ message: 'MFA disabled' });
  } catch (err) {
    console.error('[SecurityController] disableMfa:', err);
    res.status(500).json({ message: 'Failed to disable MFA' });
  }
};

// ─── Audit Logs ────────────────────────────────────────────────────────────────

exports.getAuditLogs = async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') return res.status(403).json({ message: 'Admin access required' });
    const { userId, action, resourceType, startDate, endDate, limit = 50, offset = 0 } = req.query;
    const [logs, total] = await Promise.all([
      AuditService.getLogs({ userId, action, resourceType, startDate, endDate, limit: parseInt(limit), offset: parseInt(offset) }),
      AuditService.countLogs({ userId, action, resourceType, startDate, endDate }),
    ]);
    res.json({ logs, total });
  } catch (err) {
    console.error('[SecurityController] getAuditLogs:', err);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
};

// ─── Security Events ───────────────────────────────────────────────────────────

exports.getSecurityEvents = async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') return res.status(403).json({ message: 'Admin access required' });
    const { severity, eventType, isResolved, limit = 50, offset = 0 } = req.query;
    const events = await AuditService.getSecurityEvents({ severity, eventType, isResolved: isResolved === 'true' ? true : isResolved === 'false' ? false : undefined, limit: parseInt(limit), offset: parseInt(offset) });
    res.json({ events });
  } catch (err) {
    console.error('[SecurityController] getSecurityEvents:', err);
    res.status(500).json({ message: 'Failed to fetch security events' });
  }
};

exports.resolveSecurityEvent = async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') return res.status(403).json({ message: 'Admin access required' });
    const { rows } = await db.query(`
      UPDATE security_events SET is_resolved=TRUE, resolved_at=CURRENT_TIMESTAMP, resolved_by=$1
      WHERE id=$2 RETURNING *
    `, [req.user.id, req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Security event resolved', event: rows[0] });
  } catch (err) {
    console.error('[SecurityController] resolveSecurityEvent:', err);
    res.status(500).json({ message: 'Failed to resolve event' });
  }
};

// ─── Sessions ──────────────────────────────────────────────────────────────────

exports.getActiveSessions = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, session_token_hint, ip_address, user_agent, created_at, last_activity, expires_at, is_active
      FROM user_sessions
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY last_activity DESC
    `, [req.user.id]);
    res.json({ sessions: rows });
  } catch (err) {
    console.error('[SecurityController] getActiveSessions:', err);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    await db.query(`UPDATE user_sessions SET is_active=FALSE WHERE id=$1 AND user_id=$2`, [req.params.sessionId, req.user.id]);
    await AuditService.log({ userId: req.user.id, action: 'session_revoked', resourceType: 'session', resourceId: req.params.sessionId });
    res.json({ message: 'Session revoked' });
  } catch (err) {
    console.error('[SecurityController] revokeSession:', err);
    res.status(500).json({ message: 'Failed to revoke session' });
  }
};

// ─── Security Dashboard ────────────────────────────────────────────────────────

exports.getSecurityStats = async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') return res.status(403).json({ message: 'Admin access required' });
    const stats = await AuditService.getSecurityStats();
    res.json({ stats });
  } catch (err) {
    console.error('[SecurityController] getSecurityStats:', err);
    res.status(500).json({ message: 'Failed to fetch security stats' });
  }
};

// ─── Password Policy ───────────────────────────────────────────────────────────

exports.getPasswordPolicy = async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM security_policies WHERE policy_type = 'password' LIMIT 1`);
    if (rows[0]) {
      res.json({ policy: rows[0] });
    } else {
      res.json({ policy: { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecial: true, maxAgeDays: 90 } });
    }
  } catch (err) {
    console.error('[SecurityController] getPasswordPolicy:', err);
    res.status(500).json({ message: 'Failed to fetch password policy' });
  }
};

exports.updatePasswordPolicy = async (req, res) => {
  try {
    if (req.user.role_name !== 'Admin') return res.status(403).json({ message: 'Admin access required' });
    const { rows } = await db.query(`
      INSERT INTO security_policies (policy_type, policy_config, updated_by)
      VALUES ('password', $1, $2)
      ON CONFLICT (policy_type) DO UPDATE SET policy_config=$1, updated_by=$2, updated_at=CURRENT_TIMESTAMP
      RETURNING *
    `, [JSON.stringify(req.body), req.user.id]);
    await AuditService.log({ userId: req.user.id, action: 'password_policy_updated', resourceType: 'security_policy' });
    res.json({ message: 'Password policy updated', policy: rows[0] });
  } catch (err) {
    console.error('[SecurityController] updatePasswordPolicy:', err);
    res.status(500).json({ message: 'Failed to update policy' });
  }
};
