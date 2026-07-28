const db = require('../config/db');
const crypto = require('crypto');

const TokenModel = {
  // Refresh Token Queries
  async createRefreshToken(userId, token, expiresAt) {
    if (db.isMock()) {
      const data = db.getMockData();
      const newToken = {
        id: `token-${crypto.randomBytes(8).toString('hex')}`,
        user_id: userId,
        token: token,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      };
      data.refresh_tokens.push(newToken);
      db.saveMockData(data);
      return newToken;
    }
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const { rows } = await db.query(query, [userId, token, expiresAt]);
    return rows[0];
  },

  async findRefreshToken(token) {
    if (db.isMock()) {
      const data = db.getMockData();
      return data.refresh_tokens.find(t => t.token === token) || null;
    }
    const query = 'SELECT * FROM refresh_tokens WHERE token = $1';
    const { rows } = await db.query(query, [token]);
    return rows[0] || null;
  },

  async deleteRefreshToken(token) {
    if (db.isMock()) {
      const data = db.getMockData();
      const exists = data.refresh_tokens.some(t => t.token === token);
      if (!exists) return null;
      data.refresh_tokens = data.refresh_tokens.filter(t => t.token !== token);
      db.saveMockData(data);
      return { token };
    }
    const query = 'DELETE FROM refresh_tokens WHERE token = $1 RETURNING id';
    const { rows } = await db.query(query, [token]);
    return rows[0] || null;
  },

  async deleteUserRefreshTokens(userId) {
    if (db.isMock()) {
      const data = db.getMockData();
      data.refresh_tokens = data.refresh_tokens.filter(t => t.user_id !== userId);
      db.saveMockData(data);
      return;
    }
    const query = 'DELETE FROM refresh_tokens WHERE user_id = $1';
    await db.query(query, [userId]);
  },

  // Password Reset Queries
  async createPasswordReset(userId, token, expiresAt) {
    if (db.isMock()) {
      const data = db.getMockData();
      // Clear existing first
      data.password_resets = data.password_resets.filter(r => r.user_id !== userId);
      const newReset = {
        id: `reset-${crypto.randomBytes(8).toString('hex')}`,
        user_id: userId,
        token: token,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      };
      data.password_resets.push(newReset);
      db.saveMockData(data);
      return newReset;
    }
    await db.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);

    const query = `
      INSERT INTO password_resets (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const { rows } = await db.query(query, [userId, token, expiresAt]);
    return rows[0];
  },

  async findPasswordReset(token) {
    if (db.isMock()) {
      const data = db.getMockData();
      return data.password_resets.find(r => r.token === token) || null;
    }
    const query = 'SELECT * FROM password_resets WHERE token = $1';
    const { rows } = await db.query(query, [token]);
    return rows[0] || null;
  },

  async deletePasswordReset(token) {
    if (db.isMock()) {
      const data = db.getMockData();
      data.password_resets = data.password_resets.filter(r => r.token !== token);
      db.saveMockData(data);
      return;
    }
    const query = 'DELETE FROM password_resets WHERE token = $1';
    await db.query(query, [token]);
  }
};

module.exports = TokenModel;
