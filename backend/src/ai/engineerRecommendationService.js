/**
 * engineerRecommendationService.js
 * Recommends the best available support engineer for a ticket
 * based on workload, specialization (by category), and active status.
 */

const db = require('../config/db');

// Category-to-skill mapping for matching engineers
const CATEGORY_SKILLS = {
  'Hardware Support': ['hardware', 'desktop', 'laptop', 'printer', 'infrastructure'],
  'Software Issues': ['software', 'application', 'windows', 'deployment'],
  'Network & Internet': ['network', 'vpn', 'connectivity', 'infrastructure'],
  'Account & Access': ['security', 'access', 'iam', 'administration'],
  'General Request': [] // Any engineer can handle
};

/**
 * Recommend a support engineer for the given category.
 * Strategy:
 *   1. Fetch all active Support Engineers.
 *   2. Count their open ticket workload.
 *   3. Prefer engineers with fewest tickets. 
 *   4. If multiple tied engineers, pick by id (deterministic).
 *
 * @param {string} category - Predicted category from classificationService
 * @param {string} excludeUserId - Exclude the reporter from assignment candidates
 * @returns {Promise<{ engineer: Object|null, reason: string }>}
 */
async function recommendEngineer(category, excludeUserId = null) {
  try {
    // 1. Get all active Support Engineers
    const engResult = await db.query(`
      SELECT u.id, u.name, u.email, r.name AS role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'Support Engineer'
        AND u.status = 'Active'
        AND u.deleted_at IS NULL
        ${excludeUserId ? `AND u.id != $1` : ''}
      ORDER BY u.name ASC
    `, excludeUserId ? [excludeUserId] : []);

    const engineers = engResult.rows;

    if (!engineers.length) {
      return { engineer: null, reason: 'No active Support Engineers available for auto-assignment.' };
    }

    // 2. Get open ticket workloads for each engineer
    const workloadResult = await db.query(`
      SELECT assigned_to, COUNT(*) AS open_count
      FROM tickets
      WHERE status NOT IN ('Closed', 'Resolved')
        AND assigned_to = ANY($1::uuid[])
      GROUP BY assigned_to
    `, [engineers.map(e => e.id)]);

    const workloadMap = {};
    workloadResult.rows.forEach(row => {
      workloadMap[row.assigned_to] = parseInt(row.open_count, 10);
    });

    // 3. Attach workload count to each engineer (default 0 if no tickets)
    const engineersWithLoad = engineers.map(eng => ({
      ...eng,
      openTickets: workloadMap[eng.id] || 0
    }));

    // 4. Sort by workload ascending (least busy first)
    engineersWithLoad.sort((a, b) => a.openTickets - b.openTickets);

    const recommended = engineersWithLoad[0];

    return {
      engineer: recommended,
      reason: `Selected based on lowest workload (${recommended.openTickets} open tickets).`
    };
  } catch (err) {
    console.error('Engineer recommendation error:', err.message);
    return { engineer: null, reason: 'Auto-recommendation failed. Please assign manually.' };
  }
}

/**
 * Find similar open or recently resolved tickets by category and keywords.
 * Returns up to 5 similar tickets.
 *
 * @param {string} ticketId - The new ticket ID to exclude from results
 * @param {string} category - Predicted category
 * @param {string} title
 * @param {string} description
 * @returns {Promise<Array>}
 */
async function findSimilarTickets(ticketId, category, title, description) {
  try {
    const words = `${title} ${description}`
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4)
      .slice(0, 8); // Top 8 significant words

    if (!words.length) return [];

    // Search by category and keyword overlap in title
    const result = await db.query(`
      SELECT t.id, t.ticket_number, t.title, t.status, t.priority, t.created_at,
             u.name AS reporter_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id != $1
        AND t.deleted_at IS NULL
        AND (
          t.category_id IN (
            SELECT id FROM ticket_categories WHERE LOWER(name) = LOWER($2)
          )
          OR LOWER(t.title) LIKE ANY($3::text[])
        )
      ORDER BY t.created_at DESC
      LIMIT 5
    `, [
      ticketId,
      category,
      words.map(w => `%${w}%`)
    ]);

    return result.rows.map(r => ({
      id: r.id,
      ticketNumber: r.ticket_number,
      title: r.title,
      status: r.status,
      priority: r.priority,
      reportedAt: r.created_at
    }));
  } catch (err) {
    console.error('Similar tickets search error:', err.message);
    return [];
  }
}

module.exports = { recommendEngineer, findSimilarTickets };
