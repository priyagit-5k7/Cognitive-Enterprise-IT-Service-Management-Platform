/**
 * aiController.js
 * REST API handlers for the AI Ticket Intelligence Module.
 */

const { getPrediction, reAnalyzeTicket, getAiAnalyticsSummary } = require('../ai/aiOrchestrator');
const db = require('../config/db');

/**
 * GET /api/v1/ai/tickets/:id/prediction
 * Returns the stored AI prediction for a specific ticket.
 * Accessible by: Admin, Manager, Team Lead, Support Engineer
 */
const getTicketPrediction = async (req, res) => {
  const { id } = req.params;

  try {
    // Verify the ticket exists and requester has access
    const ticketResult = await db.query(
      `SELECT id, title, description, type, created_by FROM tickets WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (!ticketResult.rowCount) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const ticket = ticketResult.rows[0];

    // Clients can only access their own ticket predictions
    if (req.user.role_name === 'Client' && ticket.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only view predictions for your own tickets.' });
    }

    let prediction = await getPrediction(id);

    // If no prediction exists yet, run analysis on demand
    if (!prediction) {
      const { analyzeTicket } = require('../ai/aiOrchestrator');
      prediction = await analyzeTicket(ticket);
    }

    return res.status(200).json({ prediction });
  } catch (err) {
    console.error('Get AI prediction error:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve AI prediction.' });
  }
};

/**
 * POST /api/v1/ai/tickets/:id/re-analyze
 * Re-runs AI analysis on a ticket (e.g., after content update).
 * Accessible by: Admin, Manager, Team Lead
 */
const reAnalyzeTicketById = async (req, res) => {
  const { id } = req.params;

  try {
    const ticketResult = await db.query(
      `SELECT id, title, description, type, created_by FROM tickets WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (!ticketResult.rowCount) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const ticket = ticketResult.rows[0];
    const prediction = await reAnalyzeTicket(ticket);

    return res.status(200).json({
      message: 'AI analysis completed successfully.',
      prediction
    });
  } catch (err) {
    console.error('Re-analyze ticket error:', err.message);
    return res.status(500).json({ message: 'Failed to re-analyze ticket.' });
  }
};

/**
 * GET /api/v1/ai/analytics
 * Returns summary analytics about AI predictions across all tickets.
 * Accessible by: Admin, Manager
 */
const getAnalytics = async (req, res) => {
  try {
    // Prediction stats
    const statsResult = await db.query(`
      SELECT
        COUNT(*) AS total_predictions,
        ROUND(AVG(confidence)) AS avg_confidence,
        COUNT(CASE WHEN confidence >= 80 THEN 1 END) AS high_confidence_count,
        COUNT(CASE WHEN confidence >= 50 AND confidence < 80 THEN 1 END) AS medium_confidence_count,
        COUNT(CASE WHEN confidence < 50 THEN 1 END) AS low_confidence_count
      FROM ai_predictions
    `);

    // Category distribution
    const categoryResult = await db.query(`
      SELECT predicted_category, COUNT(*) AS count
      FROM ai_predictions
      GROUP BY predicted_category
      ORDER BY count DESC
    `);

    // Priority distribution
    const priorityResult = await db.query(`
      SELECT predicted_priority, COUNT(*) AS count
      FROM ai_predictions
      GROUP BY predicted_priority
      ORDER BY CASE predicted_priority
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
        ELSE 5
      END
    `);

    // Recent predictions
    const recentResult = await db.query(`
      SELECT
        ap.ticket_id,
        t.ticket_number,
        t.title,
        ap.predicted_category,
        ap.predicted_priority,
        ap.confidence,
        ap.created_at
      FROM ai_predictions ap
      JOIN tickets t ON ap.ticket_id = t.id
      WHERE t.deleted_at IS NULL
      ORDER BY ap.created_at DESC
      LIMIT 10
    `);

    const stats = statsResult.rows[0];

    return res.status(200).json({
      summary: {
        totalPredictions: parseInt(stats.total_predictions, 10),
        avgConfidence: parseInt(stats.avg_confidence, 10) || 0,
        highConfidenceCount: parseInt(stats.high_confidence_count, 10),
        mediumConfidenceCount: parseInt(stats.medium_confidence_count, 10),
        lowConfidenceCount: parseInt(stats.low_confidence_count, 10)
      },
      categoryDistribution: categoryResult.rows.map(r => ({
        category: r.predicted_category,
        count: parseInt(r.count, 10)
      })),
      priorityDistribution: priorityResult.rows.map(r => ({
        priority: r.predicted_priority,
        count: parseInt(r.count, 10)
      })),
      recentPredictions: recentResult.rows
    });
  } catch (err) {
    console.error('AI analytics error:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve AI analytics.' });
  }
};

/**
 * GET /api/v1/ai/knowledge-base
 * Returns all knowledge base articles.
 * Accessible by: All authenticated users
 */
const getKnowledgeBase = async (req, res) => {
  try {
    const { search, category } = req.query;

    let query = `SELECT id, title, problem, solution, keywords, category, created_at FROM knowledge_base`;
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(LOWER(title) LIKE $${params.length} OR LOWER(problem) LIKE $${params.length})`);
    }

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (conditions.length) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY category, title`;

    const result = await db.query(query, params);
    return res.status(200).json({ articles: result.rows, total: result.rowCount });
  } catch (err) {
    console.error('Knowledge base fetch error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch knowledge base articles.' });
  }
};

/**
 * GET /api/v1/ai/knowledge-base/:id
 * Returns a single KB article.
 */
const getKnowledgeBaseArticle = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM knowledge_base WHERE id = $1`,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Article not found.' });
    }

    return res.status(200).json({ article: result.rows[0] });
  } catch (err) {
    console.error('Knowledge base article fetch error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch article.' });
  }
};

/**
 * POST /api/v1/ai/chatbot
 * Simple rule-based chatbot that answers support questions.
 * Accessible by: All authenticated users (primarily Clients)
 */
const chatbot = async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Message is required.' });
  }

  try {
    const input = message.toLowerCase().trim();

    // Search knowledge base for relevant articles
    const kbResult = await db.query(`
      SELECT title, solution, keywords, category
      FROM knowledge_base
      ORDER BY title
    `);

    const articles = kbResult.rows;

    // Score articles against the user's message
    const scored = articles.map(article => {
      const keywords = article.keywords || [];
      const matched = keywords.filter(kw => input.includes(kw.toLowerCase()));
      const titleWords = article.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const titleMatch = titleWords.filter(w => input.includes(w)).length;
      return { ...article, score: matched.length + titleMatch * 0.5, matched: matched.length };
    });

    scored.sort((a, b) => b.score - a.score);
    const topResult = scored[0];

    // Greeting detection
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    if (greetings.some(g => input.startsWith(g))) {
      return res.status(200).json({
        response: `Hello! 👋 I'm your AI Support Assistant. I can help you with common IT issues.\n\nYou can ask me about:\n• WiFi/Network issues\n• Software problems\n• Account & password resets\n• Hardware issues\n• VPN & remote access\n\nWhat can I help you with today?`,
        confidence: 100,
        type: 'greeting'
      });
    }

    // Ticket status inquiry
    if (input.includes('ticket') && (input.includes('status') || input.includes('check') || input.includes('update'))) {
      return res.status(200).json({
        response: `To check your ticket status:\n1. Go to the **Tickets** section in the menu\n2. Find your ticket and click **View**\n3. You'll see real-time updates, comments, and status changes\n\nYou can also submit a new ticket by clicking the **+ Create Ticket** button.`,
        confidence: 90,
        type: 'ticket_info'
      });
    }

    // If good KB match found
    if (topResult && topResult.score >= 1) {
      return res.status(200).json({
        response: `**${topResult.title}**\n\n${topResult.solution}\n\n---\n*If this didn't solve your issue, please create a support ticket and our team will assist you.*`,
        confidence: Math.min(95, Math.round(60 + topResult.score * 5)),
        category: topResult.category,
        type: 'kb_match'
      });
    }

    // Escalation fallback
    return res.status(200).json({
      response: `I'm sorry, I couldn't find a specific solution for your query.\n\nHere's what you can do:\n1. **Create a Support Ticket** — Our engineers will investigate and respond within your SLA timeframe.\n2. **Browse the Knowledge Base** — Visit the Knowledge Base section for common IT solutions.\n3. **Contact IT Helpdesk** — For urgent issues, call the helpdesk directly.\n\nWould you like me to help you create a ticket?`,
      confidence: 30,
      type: 'escalation'
    });
  } catch (err) {
    console.error('Chatbot error:', err.message);
    return res.status(500).json({ message: 'Chatbot service temporarily unavailable.' });
  }
};

module.exports = {
  getTicketPrediction,
  reAnalyzeTicketById,
  getAnalytics,
  getKnowledgeBase,
  getKnowledgeBaseArticle,
  chatbot
};
