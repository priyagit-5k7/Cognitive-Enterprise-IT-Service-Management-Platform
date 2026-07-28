/**
 * emailService.js — Enterprise Email Service (Phase 6)
 * 
 * Features:
 * - Nodemailer with Ethereal (dev) / real SMTP (prod)
 * - Async queue — NEVER blocks API requests
 * - 12 HTML template events
 * - Centralized logging via emailQueue
 */

const nodemailer = require('nodemailer');
const emailQueue = require('./emailQueue');
const templates = require('./emailTemplates');

class EmailService {
  constructor() {
    this.transporter = null;
    this.fromAddress = `"Smart Support Desk" <${process.env.SMTP_FROM || 'noreply@smartsupportdesk.com'}>`;
    this._initTransporter();
  }

  async _initTransporter() {
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        // Production SMTP
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        console.log('[EmailService] Initialized with production SMTP');
      } else {
        // Development: Ethereal fake SMTP
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass }
        });
        console.log('[EmailService] Initialized with Ethereal (dev mode)');
        console.log(`[EmailService] Ethereal Inbox: https://ethereal.email`);
      }
    } catch (err) {
      console.error('[EmailService] Transporter init failed:', err.message);
    }
  }

  /**
   * Core send — called by the queue, not directly from controllers.
   */
  async _send(to, subject, html) {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }
    const info = await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject,
      html
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EmailService] Preview URL: ${previewUrl}`);
    }
    return info;
  }

  /**
   * Generic enqueue helper — builds template and pushes to queue.
   * API calls return immediately; email sends in background.
   */
  _enqueue(templateName, to, data) {
    if (!to) return;
    const template = templates[templateName];
    if (!template) {
      console.warn(`[EmailService] Unknown template: ${templateName}`);
      return;
    }
    const { subject, html } = template(data);
    emailQueue.enqueue(
      () => this._send(to, subject, html),
      templateName,
      to
    );
  }

  // ─────────────────────────────────────────────
  // PUBLIC API — all non-blocking
  // ─────────────────────────────────────────────

  sendTicketCreatedEmail(to, data) {
    this._enqueue('ticketCreated', to, data);
  }

  sendTicketAssignedEmail(to, data) {
    this._enqueue('ticketAssigned', to, data);
  }

  sendTicketAcceptedEmail(to, data) {
    this._enqueue('ticketAccepted', to, data);
  }

  sendTicketStatusChangedEmail(to, data) {
    this._enqueue('ticketStatusChanged', to, data);
  }

  sendTicketResolvedEmail(to, data) {
    this._enqueue('ticketResolved', to, data);
  }

  sendTicketClosedEmail(to, data) {
    this._enqueue('ticketClosed', to, data);
  }

  sendTicketReopenedEmail(to, data) {
    this._enqueue('ticketReopened', to, data);
  }

  sendSlaBreachAlert(to, data) {
    this._enqueue('slaBreachAlert', to, data);
  }

  sendTicketEscalationEmail(to, data) {
    this._enqueue('ticketEscalation', to, data);
  }

  sendPasswordResetEmail(to, data) {
    this._enqueue('passwordReset', to, data);
  }

  sendWelcomeEmail(to, data) {
    this._enqueue('welcomeEmail', to, data);
  }

  sendUserCreatedEmail(to, data) {
    this._enqueue('userCreated', to, data);
  }

  // ─────────────────────────────────────────────
  // Admin helpers
  // ─────────────────────────────────────────────

  getEmailLog(limit = 100) {
    return emailQueue.getLog(limit);
  }

  getQueueStats() {
    return emailQueue.getStats();
  }
}

module.exports = new EmailService();
