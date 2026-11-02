/**
 * engineerRecommendationService.js
 * Intelligently recommends suitable support engineers for a ticket
 * based on category specialization, active status, and live open-ticket workload.
 */

const db = require('../config/db');

/**
 * Recommend support engineers for a given category.
 * Strategy:
 *   1. Fetch all active Support Engineers matching the category specialization.
 *   2. If fewer than 2 match the category, include other active engineers as general fallback.
 *   3. Retrieve live open-ticket workloads (tickets not Closed or Resolved).
 *   4. Rank engineers:
 *      a) Category specialization match (primary)
 *      b) Lowest current open-ticket workload (secondary)
 *      c) Deterministic sort by name / ID (tie-breaker)
 *   5. Return top recommendations (at least 2 if available), with match reasons and rank.
 *
 * @param {string} category - Category name (e.g., 'Network & Internet', 'Software Issues')
 * @param {string|null} excludeUserId - Optional user ID to exclude (e.g. ticket creator)
 * @returns {Promise<{ recommendations: Array, engineer: Object|null, reason: string }>}
 */
async function recommendEngineer(category, excludeUserId = null) {
  try {
    const cleanCategory = (category || '').trim();

    // 1. Fetch all active Support Engineers from database
    const engQuery = `
      SELECT u.id, u.name, u.email, u.specialization, u.department, r.name AS role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'Support Engineer'
        AND u.status = 'Active'
        AND u.is_active = TRUE
        AND u.deleted_at IS NULL
        ${excludeUserId ? `AND u.id != $1` : ''}
      ORDER BY u.name ASC
    `;
    const engResult = await db.query(engQuery, excludeUserId ? [excludeUserId] : []);
    const allEngineers = engResult.rows;

    if (!allEngineers.length) {
      return {
        recommendations: [],
        engineer: null,
        reason: 'No active Support Engineers available for assignment.'
      };
    }

    // 2. Fetch live open ticket workloads for all active engineers
    const engIds = allEngineers.map(e => e.id);
    const workloadResult = await db.query(`
      SELECT assigned_to, COUNT(*) AS open_count
      FROM tickets
      WHERE status NOT IN ('Closed', 'Resolved')
        AND assigned_to = ANY($1::uuid[])
      GROUP BY assigned_to
    `, [engIds]);

    const workloadMap = {};
    workloadResult.rows.forEach(row => {
      workloadMap[row.assigned_to] = parseInt(row.open_count, 10);
    });

    // Attach workload count
    const engineersWithLoad = allEngineers.map(eng => ({
      ...eng,
      openTickets: workloadMap[eng.id] || 0,
      isSpecialist: cleanCategory && eng.specialization && eng.specialization.toLowerCase() === cleanCategory.toLowerCase()
    }));

    // 3. Separate specialized vs. general fallback
    const specialists = engineersWithLoad.filter(e => e.isSpecialist);
    const nonSpecialists = engineersWithLoad.filter(e => !e.isSpecialist);

    // Sort specialists by open tickets ascending
    specialists.sort((a, b) => a.openTickets - b.openTickets);
    // Sort non-specialists by open tickets ascending
    nonSpecialists.sort((a, b) => a.openTickets - b.openTickets);

    // Combine pool: specialists first, followed by general fallback
    const rankedPool = [...specialists, ...nonSpecialists];

    // Build structured recommendation list with rank and match reasons
    const recommendations = rankedPool.map((eng, idx) => {
      let matchReason = '';
      if (eng.isSpecialist) {
        matchReason = `Direct Specialist in ${eng.specialization} • ${eng.openTickets} open ticket${eng.openTickets === 1 ? '' : 's'}`;
      } else {
        matchReason = `General Support Backup • ${eng.openTickets} open ticket${eng.openTickets === 1 ? '' : 's'}`;
      }

      return {
        id: eng.id,
        name: eng.name,
        email: eng.email,
        specialization: eng.specialization || 'General Support',
        department: eng.department || 'IT Operations',
        openTickets: eng.openTickets,
        isSpecialist: !!eng.isSpecialist,
        rank: idx + 1,
        matchReason
      };
    });

    const topCandidate = recommendations[0] || null;
    const topReason = topCandidate
      ? (topCandidate.isSpecialist
          ? `Top recommended: ${topCandidate.name} (Specialist in ${topCandidate.specialization} with ${topCandidate.openTickets} open tickets)`
          : `Top recommended: ${topCandidate.name} (General fallback with ${topCandidate.openTickets} open tickets)`)
      : 'No candidate available';

    return {
      recommendations,
      engineer: topCandidate,
      reason: topReason
    };
  } catch (err) {
    console.error('Engineer recommendation error:', err.message);
    return {
      recommendations: [],
      engineer: null,
      reason: 'Auto-recommendation failed. Please assign manually.'
    };
  }
}

/**
 * Find similar open or recently resolved tickets by category and keywords.
 * Returns up to 5 similar tickets.
 */
async function findSimilarTickets(ticketId, category, title, description) {
  try {
    const words = `${title} ${description}`
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4)
      .slice(0, 8);

    if (!words.length) return [];

    const result = await db.query(`
      SELECT t.id, t.ticket_number, t.title, t.status, t.priority, t.created_at,
             u.name AS reporter_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id != $1
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
      category || '',
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
