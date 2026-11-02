const db = require('../config/db');
const emailService = require('./emailService');

class SLAService {
  /**
   * Fetch all active SLA policies and cache them (in-memory for speed, assuming rarely changes).
   * NOTE: Do NOT call this in the constructor. It must be called explicitly after the database
   * connection has been confirmed ready (see cronService.start() → slaService.loadPolicies()).
   */
  constructor() {
    this.policies = {};
    // Policies are NOT loaded here — call loadPolicies() explicitly after DB connects.
  }

  /**
   * Explicitly load SLA policies from the database.
   * Called by cronService.start() after the database is confirmed ready.
   */
  async loadPolicies() {
    await this.refreshPolicies();
  }

  async refreshPolicies() {
    try {
      const result = await db.query(`SELECT priority, resolution_time_minutes FROM sla_policies WHERE is_active = TRUE`);
      const newPolicies = {};
      result.rows.forEach(p => {
        newPolicies[p.priority] = p.resolution_time_minutes;
      });
      this.policies = newPolicies;
      console.log('[SLA Service] Policies loaded.');
    } catch (err) {
      console.error('[SLA Service] Error loading policies:', err.message);
    }
  }

  /**
   * Calculate due date based on priority.
   * Basic implementation: adds resolution_time_minutes to createdAt.
   * Can be enhanced to skip weekends or non-business hours later.
   */
  async calculateDueDate(priority, createdAt = new Date()) {
    if (Object.keys(this.policies).length === 0) {
      await this.refreshPolicies();
    }
    const minutes = this.policies[priority];
    if (!minutes) {
      return null; // No SLA policy for this priority
    }
    const dueDate = new Date(createdAt.getTime() + minutes * 60000);
    return dueDate;
  }

  /**
   * Automatically find open tickets that have breached their SLA and mark them.
   * Returns the updated tickets.
   */
  async checkSlaBreaches() {
    try {
      const result = await db.query(`
        UPDATE tickets
        SET sla_breached = TRUE
        WHERE status NOT IN ('Closed', 'Resolved')
          AND sla_due_date < NOW()
          AND sla_breached = FALSE
        RETURNING id, ticket_number, title, assigned_to, priority
      `);

      if (result.rowCount > 0) {
        console.log(`[SLA Service] Detected and marked ${result.rowCount} SLA breaches.`);

        // Phase 6: Trigger emails for each breach
        for (const ticket of result.rows) {
          if (ticket.assigned_to) {
            // Find assignee email
            const userRes = await db.query('SELECT email FROM users WHERE id = $1', [ticket.assigned_to]);
            if (userRes.rowCount > 0) {
              emailService.sendSlaBreachAlert(userRes.rows[0].email, ticket.ticket_number, ticket.title, ticket.priority);
            }
          }
        }
      }
      return result.rows;
    } catch (err) {
      console.error('[SLA Service] Error checking breaches:', err.message);
      return [];
    }
  }
}

module.exports = new SLAService();
