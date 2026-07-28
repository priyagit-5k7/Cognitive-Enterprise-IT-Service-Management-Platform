/**
 * aiPlatformController.js — Advanced AI Platform Controller (Phase 19)
 * Exposes RAG chat, summarization, root cause analysis, and AI performance dashboard.
 */

const db = require('../config/db');
const llmAdapter = require('../ai/llmAdapter');
const ragEngine = require('../ai/ragEngine');

// ─── Conversations ─────────────────────────────────────────────────────────────

exports.getConversations = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.*, (SELECT COUNT(*) FROM ai_conversation_messages WHERE conversation_id = c.id) AS message_count
      FROM ai_conversations c
      WHERE c.user_id = $1 AND c.is_active = TRUE
      ORDER BY c.updated_at DESC LIMIT 20
    `, [req.user.id]);
    res.json({ conversations: rows, provider: llmAdapter.getProvider() });
  } catch (err) {
    console.error('[AIPlatformController] getConversations:', err);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

exports.createConversation = async (req, res) => {
  try {
    const { title } = req.body;
    const { rows } = await db.query(`
      INSERT INTO ai_conversations (user_id, title, provider)
      VALUES ($1,$2,$3) RETURNING *
    `, [req.user.id, title || 'New Conversation', llmAdapter.getProvider()]);
    res.status(201).json({ conversation: rows[0] });
  } catch (err) {
    console.error('[AIPlatformController] createConversation:', err);
    res.status(500).json({ message: 'Failed to create conversation' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT * FROM ai_conversation_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `, [req.params.conversationId]);
    res.json({ messages: rows });
  } catch (err) {
    console.error('[AIPlatformController] getMessages:', err);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Message content is required' });

    // Verify conversation belongs to user
    const convCheck = await db.query(`SELECT * FROM ai_conversations WHERE id = $1 AND user_id = $2`, [conversationId, req.user.id]);
    if (!convCheck.rows[0]) return res.status(404).json({ message: 'Conversation not found' });

    // Save user message
    await db.query(`
      INSERT INTO ai_conversation_messages (conversation_id, role, content)
      VALUES ($1, 'user', $2)
    `, [conversationId, content]);

    // Build RAG-augmented prompt
    const { messages, knowledgeContext } = await ragEngine.buildMessages(content, conversationId);

    // Get LLM response
    const llmResult = await llmAdapter.chat(messages);

    // Save assistant message
    const { rows } = await db.query(`
      INSERT INTO ai_conversation_messages (conversation_id, role, content, tokens_used, metadata)
      VALUES ($1, 'assistant', $2, $3, $4) RETURNING *
    `, [conversationId, llmResult.content, llmResult.usage?.tokens || 0, JSON.stringify({ provider: llmResult.provider, model: llmResult.model })]);

    // Update conversation timestamp
    await db.query(`UPDATE ai_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [conversationId]);

    res.json({
      message: rows[0],
      knowledgeUsed: knowledgeContext.length,
      provider: llmResult.provider,
    });
  } catch (err) {
    console.error('[AIPlatformController] sendMessage:', err);
    res.status(500).json({ message: 'Failed to process message' });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    await db.query(`UPDATE ai_conversations SET is_active = FALSE WHERE id = $1 AND user_id = $2`, [req.params.conversationId, req.user.id]);
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    console.error('[AIPlatformController] deleteConversation:', err);
    res.status(500).json({ message: 'Failed to delete conversation' });
  }
};

// ─── Ticket Intelligence ───────────────────────────────────────────────────────

exports.summarizeTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rows } = await db.query(`
      SELECT t.*, tc.name AS category_name, u.name AS requester_name
      FROM tickets t
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [ticketId]);
    if (!rows[0]) return res.status(404).json({ message: 'Ticket not found' });

    const ticket = rows[0];
    const text = `Ticket: ${ticket.title}\nDescription: ${ticket.description}\nCategory: ${ticket.category_name}\nPriority: ${ticket.priority}\nStatus: ${ticket.status}\nRequester: ${ticket.requester_name}`;
    const summary = await llmAdapter.summarize(text);
    res.json({ summary, provider: llmAdapter.getProvider() });
  } catch (err) {
    console.error('[AIPlatformController] summarizeTicket:', err);
    res.status(500).json({ message: 'Summarization failed' });
  }
};

exports.suggestResolution = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rows } = await db.query(`
      SELECT t.*, tc.name AS category_name FROM tickets t
      LEFT JOIN ticket_categories tc ON t.category_id = tc.id WHERE t.id = $1
    `, [ticketId]);
    if (!rows[0]) return res.status(404).json({ message: 'Ticket not found' });

    const ticket = rows[0];
    const kbContext = await ragEngine.retrieveKnowledge(`${ticket.title} ${ticket.description}`, 3);
    const suggestion = await llmAdapter.suggestResolution(ticket, kbContext);
    res.json({ suggestion, knowledgeUsed: kbContext.length, provider: llmAdapter.getProvider() });
  } catch (err) {
    console.error('[AIPlatformController] suggestResolution:', err);
    res.status(500).json({ message: 'Resolution suggestion failed' });
  }
};

// ─── Problem Root Cause Analysis ───────────────────────────────────────────────

exports.analyzeRootCause = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { rows: pRows } = await db.query(`SELECT * FROM problems WHERE id = $1`, [problemId]);
    if (!pRows[0]) return res.status(404).json({ message: 'Problem not found' });

    const { rows: incidents } = await db.query(`
      SELECT t.title, t.status FROM incident_problem_mapping ipm
      JOIN tickets t ON ipm.ticket_id = t.id WHERE ipm.problem_id = $1
    `, [problemId]);

    const analysis = await llmAdapter.analyzeRootCause(pRows[0], incidents);
    res.json({ analysis, incidentsAnalyzed: incidents.length, provider: llmAdapter.getProvider() });
  } catch (err) {
    console.error('[AIPlatformController] analyzeRootCause:', err);
    res.status(500).json({ message: 'Root cause analysis failed' });
  }
};

// ─── AI Performance Dashboard ──────────────────────────────────────────────────

exports.getPerformanceMetrics = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        provider, operation,
        COUNT(*) AS total_calls,
        AVG(latency_ms) AS avg_latency_ms,
        SUM(tokens_used) AS total_tokens,
        COUNT(*) FILTER (WHERE success = TRUE) AS successful,
        COUNT(*) FILTER (WHERE success = FALSE) AS failed,
        MAX(created_at) AS last_call
      FROM ai_performance_metrics
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY provider, operation
      ORDER BY total_calls DESC
    `);

    const { rows: daily } = await db.query(`
      SELECT DATE(created_at) AS date, COUNT(*) AS calls, AVG(latency_ms) AS avg_latency
      FROM ai_performance_metrics WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at) ORDER BY date
    `);

    const { rows: convStats } = await db.query(`
      SELECT COUNT(*) AS total_conversations,
             SUM((SELECT COUNT(*) FROM ai_conversation_messages WHERE conversation_id = c.id)) AS total_messages
      FROM ai_conversations c WHERE c.user_id = $1
    `, [req.user.id]);

    res.json({
      metrics: rows,
      dailyUsage: daily,
      conversationStats: convStats[0],
      currentProvider: llmAdapter.getProvider(),
    });
  } catch (err) {
    console.error('[AIPlatformController] getPerformanceMetrics:', err);
    res.status(500).json({ message: 'Failed to fetch AI metrics' });
  }
};

// ─── Knowledge Search ──────────────────────────────────────────────────────────

exports.knowledgeSearch = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: 'Query is required' });
    const results = await ragEngine.retrieveKnowledge(query, 10);
    res.json({ results, count: results.length });
  } catch (err) {
    console.error('[AIPlatformController] knowledgeSearch:', err);
    res.status(500).json({ message: 'Knowledge search failed' });
  }
};

// ─── Provider Info ─────────────────────────────────────────────────────────────

exports.getProviderInfo = async (req, res) => {
  res.json({
    currentProvider: llmAdapter.getProvider(),
    availableProviders: ['mock', 'openai', 'gemini', 'ollama'],
    configuration: {
      openai: { envVar: 'OPENAI_API_KEY', modelEnvVar: 'OPENAI_MODEL' },
      gemini: { envVar: 'GEMINI_API_KEY', modelEnvVar: 'GEMINI_MODEL' },
      ollama: { envVar: 'OLLAMA_BASE_URL', modelEnvVar: 'OLLAMA_MODEL' },
    },
  });
};
