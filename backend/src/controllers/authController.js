const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const UserModel = require('../models/userModel');
const TokenModel = require('../models/tokenModel');
const RoleModel = require('../models/roleModel');
const emailService = require('../services/emailService');
require('dotenv').config();

// Helper to generate access & refresh tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshTokenValue = crypto.randomBytes(40).toString('hex');
  const refreshTokenExpires = new Date();
  refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 7); // 7 days

  return { accessToken, refreshTokenValue, refreshTokenExpires };
};

const AuthController = {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Check if user exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already registered' });
      }

      // Find "Client" role ID
      const clientRole = await RoleModel.findByName('Client');
      if (!clientRole) {
        return res.status(500).json({ message: 'Default Client role not configured in database' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user
      const user = await UserModel.create({
        name,
        email,
        passwordHash,
        roleId: clientRole.id,
      });

      // Send welcome email (non-blocking)
      emailService.sendWelcomeEmail(user.email, {
        userName: user.name,
        email: user.email
      });

      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role_id: user.role_id,
          role_name: 'Client',
        },
      });
    } catch (err) {
      console.error('Registration error:', err);
      if (
        err.code === 'ECONNREFUSED' ||
        err.message?.includes('connect ECONNREFUSED') ||
        err.message?.includes('Missing production database configuration')
      ) {
        return res.status(503).json({
          message: 'Database service is currently unreachable or not configured. Please ensure DATABASE_URL is set in Vercel project environment variables.'
        });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!user.is_active) {
        return res.status(403).json({ message: 'Your account is deactivated' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate tokens
      const { accessToken, refreshTokenValue, refreshTokenExpires } = generateTokens(user);

      // Store refresh token
      await TokenModel.createRefreshToken(user.id, refreshTokenValue, refreshTokenExpires);

      res.json({
        message: 'Login successful',
        accessToken,
        refreshToken: refreshTokenValue,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role_id: user.role_id,
          role_name: user.role_name,
          permissions: user.permissions,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      if (
        err.code === 'ECONNREFUSED' ||
        err.message?.includes('connect ECONNREFUSED') ||
        err.message?.includes('Missing production database configuration')
      ) {
        return res.status(503).json({
          message: 'Database service is currently unreachable or not configured. Please ensure DATABASE_URL is set in Vercel project environment variables.'
        });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }

      const tokenRecord = await TokenModel.findRefreshToken(refreshToken);
      if (!tokenRecord) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      if (new Date(tokenRecord.expires_at) < new Date()) {
        await TokenModel.deleteRefreshToken(refreshToken);
        return res.status(401).json({ message: 'Refresh token has expired' });
      }

      const user = await UserModel.findById(tokenRecord.user_id);
      if (!user || !user.is_active) {
        return res.status(401).json({ message: 'User deactivated or not found' });
      }

      // Rotate Refresh Token
      const { accessToken, refreshTokenValue, refreshTokenExpires } = generateTokens(user);
      await TokenModel.deleteRefreshToken(refreshToken);
      await TokenModel.createRefreshToken(user.id, refreshTokenValue, refreshTokenExpires);

      res.json({
        accessToken,
        refreshToken: refreshTokenValue,
      });
    } catch (err) {
      console.error('Refresh token error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await TokenModel.deleteRefreshToken(refreshToken);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      console.error('Logout error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        // Return 200 even if email doesn't exist for security reasons, but for a dev flow, let's return a success message
        return res.json({ message: 'If the email exists, a password reset token has been generated.' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

      await TokenModel.createPasswordReset(user.id, resetToken, expiresAt);

      // Send real password reset email (non-blocking)
      const APP_URL = process.env.APP_URL || 'http://localhost:5173';
      const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
      emailService.sendPasswordResetEmail(user.email, {
        userName: user.name,
        resetLink
      });

      // Still return token in dev mode for convenience
      const response = { message: 'Password reset link has been sent to your email.' };
      if (process.env.NODE_ENV === 'development') {
        response.resetToken = resetToken; // Dev convenience only
      }
      res.json(response);
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }

      const resetRecord = await TokenModel.findPasswordReset(token);
      if (!resetRecord) {
        return res.status(400).json({ message: 'Invalid or expired password reset token' });
      }

      if (new Date(resetRecord.expires_at) < new Date()) {
        await TokenModel.deletePasswordReset(token);
        return res.status(400).json({ message: 'Password reset token has expired' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Get user and update password
      const user = await UserModel.findById(resetRecord.user_id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update password hash and wipe active refresh tokens to force re-auth everywhere
      const db = require('../config/db');
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
      await TokenModel.deleteUserRefreshTokens(user.id);
      await TokenModel.deletePasswordReset(token);

      res.json({ message: 'Password has been reset successfully. You can now login.' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async me(req, res) {
    // req.user is attached via authenticate middleware
    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role_id: req.user.role_id,
        role_name: req.user.role_name,
        permissions: req.user.permissions,
      },
    });
  },
};

module.exports = AuthController;
