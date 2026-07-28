/**
 * emailTemplates.js
 * Branded HTML email templates for all system events.
 * Each template returns an object: { subject, html }
 */

const BRAND_COLOR = '#6366F1';
const DANGER_COLOR = '#EF4444';
const SUCCESS_COLOR = '#10B981';
const WARNING_COLOR = '#F59E0B';
const APP_NAME = 'Smart Support Desk';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

/**
 * Wraps content in the standard branded email layout.
 */
function layout(content, accentColor = BRAND_COLOR) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#0F0F1A;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F0F1A;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1A1A2E;border-radius:12px;overflow:hidden;border:1px solid #2D2D44;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${accentColor},#818CF8);padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-block;text-align:center;line-height:40px;font-size:20px;margin-right:12px;vertical-align:middle;">🎯</div>
                    <span style="color:#FFFFFF;font-size:20px;font-weight:700;vertical-align:middle;">${APP_NAME}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#13131F;padding:20px 32px;border-top:1px solid #2D2D44;">
              <p style="color:#6B7280;font-size:12px;margin:0;text-align:center;">
                This is an automated message from ${APP_NAME}. Please do not reply to this email.<br/>
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function badge(text, color) {
  return `<span style="display:inline-block;background:${color}22;color:${color};border:1px solid ${color}44;border-radius:6px;padding:3px 10px;font-size:13px;font-weight:600;">${text}</span>`;
}

function button(text, url, color = BRAND_COLOR) {
  return `<a href="${url}" style="display:inline-block;background:${color};color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-top:20px;">${text}</a>`;
}

function ticketCard(ticketNumber, title, status, priority) {
  const priorityColors = { Critical: DANGER_COLOR, High: '#F97316', Medium: WARNING_COLOR, Low: SUCCESS_COLOR, Urgent: DANGER_COLOR };
  const pColor = priorityColors[priority] || '#6B7280';
  return `
  <div style="background:#13131F;border:1px solid #2D2D44;border-radius:8px;padding:16px;margin:16px 0;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="color:#818CF8;font-size:13px;font-weight:600;font-family:monospace;">TKT-${ticketNumber}</span>
      ${status ? badge(status, BRAND_COLOR) : ''}
    </div>
    <p style="color:#E2E8F0;font-size:15px;font-weight:600;margin:4px 0 8px 0;">${title}</p>
    ${priority ? `<p style="color:#94A3B8;font-size:13px;margin:0;">Priority: ${badge(priority, pColor)}</p>` : ''}
  </div>`;
}

// ─────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────

const templates = {

  ticketCreated({ ticketNumber, title, priority, clientName }) {
    return {
      subject: `[TKT-${ticketNumber}] Your support ticket has been received`,
      html: layout(`
        <h2 style="color:#E2E8F0;font-size:22px;margin:0 0 8px 0;">Ticket Received ✅</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;">Hi ${clientName}, your support request has been successfully submitted.</p>
        ${ticketCard(ticketNumber, title, 'Created', priority)}
        <p style="color:#94A3B8;font-size:14px;margin:20px 0 0 0;">Our support team will review your ticket shortly. You'll receive updates at every stage of the process.</p>
        ${button('View Ticket', `${APP_URL}/tickets`)}
      `, SUCCESS_COLOR)
    };
  },

  ticketAssigned({ ticketNumber, title, priority, assigneeName, clientName }) {
    return {
      subject: `[TKT-${ticketNumber}] Your ticket has been assigned`,
      html: layout(`
        <h2 style="color:#E2E8F0;font-size:22px;margin:0 0 8px 0;">Ticket Assigned 👤</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;">Hi ${clientName}, your ticket has been assigned to a support engineer.</p>
        ${ticketCard(ticketNumber, title, 'Assigned', priority)}
        <div style="background:#1E1E38;border-left:4px solid ${BRAND_COLOR};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;">
          <p style="color:#94A3B8;font-size:13px;margin:0;">Assigned Engineer</p>
          <p style="color:#E2E8F0;font-size:15px;font-weight:600;margin:4px 0 0 0;">${assigneeName}</p>
        </div>
        ${button('View Ticket', `${APP_URL}/tickets`)}
      `, BRAND_COLOR)
    };
  },

  ticketAccepted({ ticketNumber, title, priority, engineerName }) {
    return {
      subject: `[TKT-${ticketNumber}] Work has started on your ticket`,
      html: layout(`
        <h2 style="color:#E2E8F0;font-size:22px;margin:0 0 8px 0;">Work In Progress 🔧</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;"><strong style="color:#E2E8F0;">${engineerName}</strong> has started working on your ticket.</p>
        ${ticketCard(ticketNumber, title, 'In Progress', priority)}
        ${button('Track Progress', `${APP_URL}/tickets`)}
      `, '#3B82F6')
    };
  },

  ticketStatusChanged({ ticketNumber, title, oldStatus, newStatus, changedBy, clientName }) {
    return {
      subject: `[TKT-${ticketNumber}] Status update: ${newStatus}`,
      html: layout(`
        <h2 style="color:#E2E8F0;font-size:22px;margin:0 0 8px 0;">Status Updated 🔄</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;">Hi ${clientName}, the status of your ticket has changed.</p>
        ${ticketCard(ticketNumber, title, newStatus, null)}
        <table width="100%" style="background:#13131F;border:1px solid #2D2D44;border-radius:8px;padding:16px;margin:8px 0;">
          <tr>
            <td style="color:#94A3B8;font-size:13px;padding:6px 12px;">Previous Status</td>
            <td style="padding:6px 12px;">${badge(oldStatus, '#6B7280')}</td>
          </tr>
          <tr>
            <td style="color:#94A3B8;font-size:13px;padding:6px 12px;">New Status</td>
            <td style="padding:6px 12px;">${badge(newStatus, BRAND_COLOR)}</td>
          </tr>
          <tr>
            <td style="color:#94A3B8;font-size:13px;padding:6px 12px;">Updated By</td>
            <td style="color:#E2E8F0;font-size:13px;font-weight:600;padding:6px 12px;">${changedBy}</td>
          </tr>
        </table>
        ${button('View Details', `${APP_URL}/tickets`)}
      `, BRAND_COLOR)
    };
  },

  ticketResolved({ ticketNumber, title, clientName, resolvedBy }) {
    return {
      subject: `[TKT-${ticketNumber}] Your ticket has been resolved`,
      html: layout(`
        <h2 style="color:#E2E8F0;font-size:22px;margin:0 0 8px 0;">Ticket Resolved 🎉</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;">Hi ${clientName}, great news! Your ticket has been resolved by <strong style="color:#E2E8F0;">${resolvedBy}</strong>.</p>
        ${ticketCard(ticketNumber, title, 'Resolved', null)}
        <div style="background:#0D2818;border:1px solid ${SUCCESS_COLOR}44;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="color:${SUCCESS_COLOR};font-size:14px;margin:0;">Please review the resolution and submit your feedback. Your ticket will be closed automatically upon feedback submission.</p>
        </div>
        ${button('Submit Feedback', `${APP_URL}/tickets`, SUCCESS_COLOR)}
      `, SUCCESS_COLOR)
    };
  },

  ticketClosed({ ticketNumber, title, clientName, rating }) {
    return {
      subject: `[TKT-${ticketNumber}] Ticket closed — Thank you!`,
      html: layout(`
        <h2 style="color:#E2E8F0;font-size:22px;margin:0 0 8px 0;">Ticket Closed ✔️</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;">Hi ${clientName}, your ticket has been officially closed.</p>
        ${ticketCard(ticketNumber, title, 'Closed', null)}
        ${rating ? `<p style="color:#94A3B8;font-size:14px;margin:16px 0 0 0;">You rated this experience: ${'⭐'.repeat(rating)} (${rating}/5)</p>` : ''}
        <p style="color:#94A3B8;font-size:14px;margin:16px 0 0 0;">Thank you for using ${APP_NAME}. Feel free to open a new ticket anytime you need support.</p>
        ${button('Open New Ticket', `${APP_URL}/tickets`)}
      `, '#6B7280')
    };
  },

  ticketReopened({ ticketNumber, title, clientName, reason }) {
    return {
      subject: `[TKT-${ticketNumber}] Ticket reopened`,
      html: layout(`
        <h2 style="color:#E2E8F0;font-size:22px;margin:0 0 8px 0;">Ticket Reopened 🔁</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;">Hi ${clientName}, your ticket has been reopened.</p>
        ${ticketCard(ticketNumber, title, 'In Progress', null)}
        ${reason ? `<div style="background:#1E1E38;border-left:4px solid ${WARNING_COLOR};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;"><p style="color:#94A3B8;font-size:13px;margin:0;">Reason</p><p style="color:#E2E8F0;font-size:14px;margin:4px 0 0 0;">${reason}</p></div>` : ''}
        ${button('View Ticket', `${APP_URL}/tickets`, WARNING_COLOR)}
      `, WARNING_COLOR)
    };
  },

  slaBreachAlert({ ticketNumber, title, priority, assigneeName, breachType }) {
    return {
      subject: `🚨 [URGENT] SLA BREACH — TKT-${ticketNumber}`,
      html: layout(`
        <h2 style="color:${DANGER_COLOR};font-size:22px;margin:0 0 8px 0;">⚠️ SLA Breach Detected</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;">Hi ${assigneeName}, the following ticket has breached its SLA agreement and requires <strong style="color:${DANGER_COLOR};">immediate attention</strong>.</p>
        ${ticketCard(ticketNumber, title, 'SLA Breached', priority)}
        <div style="background:#2D0A0A;border:1px solid ${DANGER_COLOR}44;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="color:${DANGER_COLOR};font-size:14px;font-weight:600;margin:0;">Breach Type: ${breachType || 'Resolution SLA'}</p>
          <p style="color:#94A3B8;font-size:13px;margin:8px 0 0 0;">Please take immediate action to resolve this ticket and update stakeholders.</p>
        </div>
        ${button('Resolve Now', `${APP_URL}/tickets`, DANGER_COLOR)}
      `, DANGER_COLOR)
    };
  },

  ticketEscalation({ ticketNumber, title, priority, escalatedTo, reason }) {
    return {
      subject: `[ESCALATED] TKT-${ticketNumber} requires your attention`,
      html: layout(`
        <h2 style="color:${WARNING_COLOR};font-size:22px;margin:0 0 8px 0;">Ticket Escalated 📢</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;">Hi ${escalatedTo}, a ticket has been escalated to you for review.</p>
        ${ticketCard(ticketNumber, title, 'Escalated', priority)}
        ${reason ? `<div style="background:#1E1A00;border-left:4px solid ${WARNING_COLOR};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0;"><p style="color:#94A3B8;font-size:13px;margin:0;">Escalation Reason</p><p style="color:#E2E8F0;font-size:14px;margin:4px 0 0 0;">${reason}</p></div>` : ''}
        ${button('Review Ticket', `${APP_URL}/tickets`, WARNING_COLOR)}
      `, WARNING_COLOR)
    };
  },

  passwordReset({ userName, resetLink }) {
    return {
      subject: `${APP_NAME} — Password Reset Request`,
      html: layout(`
        <h2 style="color:#E2E8F0;font-size:22px;margin:0 0 8px 0;">Reset Your Password 🔑</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;">Hi ${userName}, we received a request to reset your password.</p>
        <div style="background:#13131F;border:1px solid #2D2D44;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
          <p style="color:#94A3B8;font-size:13px;margin:0 0 16px 0;">Click the button below to reset your password. This link expires in <strong style="color:#E2E8F0;">1 hour</strong>.</p>
          ${button('Reset Password', resetLink, BRAND_COLOR)}
        </div>
        <p style="color:#6B7280;font-size:13px;margin:16px 0 0 0;">If you didn't request this, you can safely ignore this email. Your password will not be changed.</p>
      `, BRAND_COLOR)
    };
  },

  welcomeEmail({ userName, email, loginUrl }) {
    return {
      subject: `Welcome to ${APP_NAME}!`,
      html: layout(`
        <h2 style="color:#E2E8F0;font-size:22px;margin:0 0 8px 0;">Welcome aboard, ${userName}! 🚀</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;">Your account has been successfully created. You can now log in and start submitting support tickets.</p>
        <div style="background:#13131F;border:1px solid #2D2D44;border-radius:8px;padding:20px;margin:16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#6B7280;font-size:13px;padding:6px 0;">Email</td>
              <td style="color:#E2E8F0;font-size:13px;font-weight:600;padding:6px 0;">${email}</td>
            </tr>
          </table>
        </div>
        ${button('Get Started', loginUrl || APP_URL + '/login', SUCCESS_COLOR)}
        <p style="color:#6B7280;font-size:13px;margin:20px 0 0 0;">Need help? Reply to any support ticket or contact your system administrator.</p>
      `, SUCCESS_COLOR)
    };
  },

  userCreated({ userName, email, role, temporaryPassword, adminName }) {
    return {
      subject: `Your ${APP_NAME} account has been created`,
      html: layout(`
        <h2 style="color:#E2E8F0;font-size:22px;margin:0 0 8px 0;">Account Created 🎯</h2>
        <p style="color:#94A3B8;font-size:14px;margin:0 0 20px 0;">Hi ${userName}, an administrator has created an account for you on ${APP_NAME}.</p>
        <div style="background:#13131F;border:1px solid #2D2D44;border-radius:8px;padding:20px;margin:16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#6B7280;font-size:13px;padding:6px 0;">Email</td>
              <td style="color:#E2E8F0;font-size:13px;font-weight:600;padding:6px 0;">${email}</td>
            </tr>
            <tr>
              <td style="color:#6B7280;font-size:13px;padding:6px 0;">Role</td>
              <td style="padding:6px 0;">${badge(role, BRAND_COLOR)}</td>
            </tr>
            ${temporaryPassword ? `<tr><td style="color:#6B7280;font-size:13px;padding:6px 0;">Temp Password</td><td style="color:${WARNING_COLOR};font-size:13px;font-weight:600;font-family:monospace;padding:6px 0;">${temporaryPassword}</td></tr>` : ''}
          </table>
        </div>
        ${temporaryPassword ? `<p style="color:${WARNING_COLOR};font-size:13px;margin:0 0 16px 0;">⚠️ Please change your password immediately after first login.</p>` : ''}
        <p style="color:#94A3B8;font-size:13px;margin:0 0 4px 0;">Created by: <strong style="color:#E2E8F0;">${adminName || 'System Administrator'}</strong></p>
        ${button('Login Now', APP_URL + '/login', BRAND_COLOR)}
      `, BRAND_COLOR)
    };
  }
};

module.exports = templates;
