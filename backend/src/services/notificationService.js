/**
 * notificationService.js — Enterprise real-time notification service (Phase 7)
 * 
 * Creates DB record + pushes real-time socket event for every notification.
 * 11 event types covered.
 */

const NotificationModel = require('../models/notificationModel');
const socket = require('../config/socket');

class NotificationService {
  /**
   * Core push: saves to DB + emits socket event
   */
  async push({ userId, title, message, type = 'info', priority = 'normal', ticketId = null, link = null }) {
    try {
      const notification = await NotificationModel.create({ userId, title, message, type, priority, ticketId, link });
      // Real-time push to user's socket room
      socket.notifyUser(userId, 'notification:new', notification);
      return notification;
    } catch (err) {
      console.error('[NotificationService] Error pushing notification:', err.message);
    }
  }

  // ─────────────────────────────────────────────
  // EVENT METHODS
  // ─────────────────────────────────────────────

  async ticketCreated(clientId, { ticketNumber, title, ticketId }) {
    await this.push({
      userId: clientId,
      title: 'Ticket Created',
      message: `Your ticket TKT-${ticketNumber} "${title}" has been received and is being reviewed.`,
      type: 'success',
      priority: 'normal',
      ticketId,
      link: `/tickets/${ticketId}`
    });
  }

  async ticketAssigned(assigneeId, { ticketNumber, title, ticketId, clientName }) {
    await this.push({
      userId: assigneeId,
      title: 'Ticket Assigned',
      message: `TKT-${ticketNumber} "${title}" has been assigned to you.`,
      type: 'info',
      priority: 'normal',
      ticketId,
      link: `/tickets/${ticketId}`
    });
  }

  async ticketReassigned(newAssigneeId, oldAssigneeId, { ticketNumber, title, ticketId }) {
    if (newAssigneeId) {
      await this.push({
        userId: newAssigneeId,
        title: 'Ticket Reassigned To You',
        message: `TKT-${ticketNumber} "${title}" has been reassigned to you.`,
        type: 'info',
        priority: 'normal',
        ticketId,
        link: `/tickets/${ticketId}`
      });
    }
    if (oldAssigneeId) {
      await this.push({
        userId: oldAssigneeId,
        title: 'Ticket Reassigned',
        message: `TKT-${ticketNumber} "${title}" has been reassigned to another engineer.`,
        type: 'warning',
        priority: 'normal',
        ticketId,
        link: `/tickets/${ticketId}`
      });
    }
  }

  async ticketUpdated(userId, { ticketNumber, status, ticketId }) {
    await this.push({
      userId,
      title: 'Ticket Updated',
      message: `TKT-${ticketNumber} status changed to "${status}".`,
      type: 'info',
      priority: 'normal',
      ticketId,
      link: `/tickets/${ticketId}`
    });
  }

  async ticketResolved(clientId, { ticketNumber, title, ticketId, resolvedBy }) {
    await this.push({
      userId: clientId,
      title: 'Ticket Resolved',
      message: `TKT-${ticketNumber} "${title}" has been resolved by ${resolvedBy}. Please submit your feedback.`,
      type: 'success',
      priority: 'high',
      ticketId,
      link: `/tickets/${ticketId}`
    });
  }

  async ticketClosed(clientId, { ticketNumber, title, ticketId }) {
    await this.push({
      userId: clientId,
      title: 'Ticket Closed',
      message: `TKT-${ticketNumber} "${title}" has been officially closed.`,
      type: 'info',
      priority: 'normal',
      ticketId,
      link: `/tickets/${ticketId}`
    });
  }

  async commentAdded(userId, { ticketNumber, ticketId, commenterName }) {
    await this.push({
      userId,
      title: 'New Comment',
      message: `${commenterName} added a comment on TKT-${ticketNumber}.`,
      type: 'info',
      priority: 'normal',
      ticketId,
      link: `/tickets/${ticketId}`
    });
  }

  async attachmentUploaded(userId, { ticketNumber, ticketId, fileName, uploaderName }) {
    await this.push({
      userId,
      title: 'Attachment Uploaded',
      message: `${uploaderName} uploaded "${fileName}" to TKT-${ticketNumber}.`,
      type: 'info',
      priority: 'normal',
      ticketId,
      link: `/tickets/${ticketId}`
    });
  }

  async slaBreach(assigneeId, { ticketNumber, ticketId, priority }) {
    await this.push({
      userId: assigneeId,
      title: '⚠️ SLA Breach Alert',
      message: `TKT-${ticketNumber} (${priority} priority) has breached its SLA. Immediate action required!`,
      type: 'error',
      priority: 'critical',
      ticketId,
      link: `/tickets/${ticketId}`
    });
  }

  async aiRecommendationGenerated(userId, { ticketNumber, ticketId }) {
    await this.push({
      userId,
      title: 'AI Analysis Ready',
      message: `AI predictions are ready for TKT-${ticketNumber}.`,
      type: 'ai',
      priority: 'normal',
      ticketId,
      link: `/tickets/${ticketId}`
    });
  }

  async knowledgeBaseUpdated(adminIds, { articleTitle }) {
    const promises = (adminIds || []).map(uid =>
      this.push({
        userId: uid,
        title: 'Knowledge Base Updated',
        message: `A new article "${articleTitle}" has been added to the knowledge base.`,
        type: 'info',
        priority: 'normal',
        link: `/knowledge-base`
      })
    );
    await Promise.allSettled(promises);
  }

  // Legacy alias for backward compatibility
  async pushNotification(userId, title, message, type, link) {
    return this.push({ userId, title, message, type, link });
  }

  async notifyTicketCreated(clientId, ticketNumber, title) {
    return this.ticketCreated(clientId, { ticketNumber, title, ticketId: null });
  }

  async notifyTicketUpdated(userId, ticketNumber, status) {
    return this.ticketUpdated(userId, { ticketNumber, status, ticketId: null });
  }

  async notifySlaBreach(assigneeId, ticketNumber) {
    return this.slaBreach(assigneeId, { ticketNumber, ticketId: null, priority: 'Unknown' });
  }
}

module.exports = new NotificationService();
