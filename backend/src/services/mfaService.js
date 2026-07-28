/**
 * mfaService.js — Multi-Factor Authentication Service (Phase 22)
 * Implements TOTP (Time-based OTP) using native crypto — no external library needed.
 * Falls back to email OTP if TOTP secret is not configured.
 */
const crypto = require('crypto');
const db = require('../config/db');

const MfaService = {
  /**
   * Generate a TOTP secret (base32-encoded)
   */
  generateSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const bytes = crypto.randomBytes(20);
    for (let i = 0; i < 20; i++) {
      secret += chars[bytes[i] & 0x1f];
    }
    return secret;
  },

  /**
   * Generate TOTP value from secret (RFC 6238)
   */
  generateTotp(secret, window = 0) {
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let decoded = BigInt(0);
    for (const char of secret.toUpperCase()) {
      const idx = base32chars.indexOf(char);
      if (idx === -1) continue;
      decoded = (decoded << BigInt(5)) | BigInt(idx);
    }

    const timeStep = Math.floor(Date.now() / 1000 / 30) + window;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(timeStep));

    const secretBuf = Buffer.from(decoded.toString(16).padStart(40, '0'), 'hex');
    const hmac = crypto.createHmac('sha1', secretBuf).update(timeBuffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24)
      | ((hmac[offset + 1] & 0xff) << 16)
      | ((hmac[offset + 2] & 0xff) << 8)
      | (hmac[offset + 3] & 0xff);

    return String(code % 1000000).padStart(6, '0');
  },

  /**
   * Verify a TOTP code (checks ±1 window for clock drift)
   */
  verifyTotp(secret, token) {
    if (!secret || !token) return false;
    for (const window of [0, -1, 1]) {
      if (this.generateTotp(secret, window) === String(token).replace(/\s/g, '')) {
        return true;
      }
    }
    return false;
  },

  /**
   * Generate backup codes
   */
  generateBackupCodes(count = 8) {
    return Array.from({ length: count }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
  },

  /**
   * Generate email OTP (6-digit numeric)
   */
  generateEmailOtp() {
    return String(crypto.randomInt(100000, 999999));
  },

  /**
   * Get MFA config for a user
   */
  async getMfaConfig(userId) {
    const { rows } = await db.query(`SELECT * FROM mfa_configs WHERE user_id = $1`, [userId]);
    return rows[0] || null;
  },

  /**
   * Setup MFA for a user (generates secret, doesn't enable yet)
   */
  async setupMfa(userId) {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes();

    await db.query(`
      INSERT INTO mfa_configs (user_id, secret, backup_codes, method)
      VALUES ($1,$2,$3,'totp')
      ON CONFLICT (user_id) DO UPDATE SET secret=$2, backup_codes=$3, is_enabled=FALSE, verified_at=NULL, updated_at=CURRENT_TIMESTAMP
    `, [userId, secret, backupCodes]);

    return { secret, backupCodes };
  },

  /**
   * Verify and enable MFA for a user
   */
  async enableMfa(userId, token) {
    const config = await this.getMfaConfig(userId);
    if (!config) return { success: false, message: 'MFA not set up' };

    if (!this.verifyTotp(config.secret, token)) {
      return { success: false, message: 'Invalid verification code' };
    }

    await db.query(`
      UPDATE mfa_configs SET is_enabled=TRUE, verified_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE user_id=$1
    `, [userId]);
    await db.query(`UPDATE users SET mfa_enabled=TRUE WHERE id=$1`, [userId]);

    return { success: true };
  },

  /**
   * Disable MFA for a user
   */
  async disableMfa(userId) {
    await db.query(`UPDATE mfa_configs SET is_enabled=FALSE, updated_at=CURRENT_TIMESTAMP WHERE user_id=$1`, [userId]);
    await db.query(`UPDATE users SET mfa_enabled=FALSE WHERE id=$1`, [userId]);
    return { success: true };
  },

  /**
   * Verify MFA token for login (supports TOTP and backup codes)
   */
  async verifyForLogin(userId, token) {
    const config = await this.getMfaConfig(userId);
    if (!config || !config.is_enabled) return { success: true, message: 'MFA not required' };

    // Try TOTP
    if (this.verifyTotp(config.secret, token)) {
      return { success: true };
    }

    // Try backup codes
    const normalizedToken = String(token).replace(/\s/g, '').toUpperCase();
    if (config.backup_codes && config.backup_codes.includes(normalizedToken)) {
      // Remove used backup code
      const remaining = config.backup_codes.filter(c => c !== normalizedToken);
      await db.query(`UPDATE mfa_configs SET backup_codes=$1 WHERE user_id=$2`, [remaining, userId]);
      return { success: true, backupCodeUsed: true, remaining: remaining.length };
    }

    return { success: false, message: 'Invalid MFA code' };
  },
};

module.exports = MfaService;
