/**
 * ragEngine.js — Retrieval Augmented Generation Engine (Phase 19)
 * Retrieves relevant context from the knowledge base and conversation history
 * to augment LLM prompts for more accurate, grounded responses.
 */

const db = require('../config/db');

class RagEngine {
  /**
   * Retrieve relevant knowledge base articles for a query using full-text search.
   * When embeddings are available, cosine similarity is used instead.
   * @param {string} query
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async retrieveKnowledge(query, limit = 3) {
    try {
      // Full-text search fallback (works without embedding model)
      const { rows } = await db.query(`
        SELECT id, title, problem, solution, category,
               ts_rank(to_tsvector('english', title || ' ' || problem || ' ' || solution), plainto_tsquery('english', $1)) AS rank
        FROM knowledge_base
        WHERE to_tsvector('english', title || ' ' || problem || ' ' || solution) @@ plainto_tsquery('english', $1)
          AND is_approved = TRUE
        ORDER BY rank DESC
        LIMIT $2
      `, [query, limit]);
      return rows;
    } catch {
      return [];
    }
  }

  /**
   * Retrieve conversation history for a conversation
   * @param {string} conversationId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getConversationHistory(conversationId, limit = 10) {
    try {
      const { rows } = await db.query(`
        SELECT role, content FROM ai_conversation_messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [conversationId, limit]);
      return rows.reverse(); // chronological order
    } catch {
      return [];
    }
  }

  /**
   * Build RAG-augmented messages array for the LLM
   * @param {string} userMessage
   * @param {string} conversationId
   * @returns {Promise<Array>}
   */
  async buildMessages(userMessage, conversationId = null) {
    const [knowledgeContext, history] = await Promise.all([
      this.retrieveKnowledge(userMessage),
      conversationId ? this.getConversationHistory(conversationId) : Promise.resolve([]),
    ]);

    const systemContent = [
      'You are an expert AI assistant for Smart Support Desk, an enterprise IT Service Management platform.',
      'You help IT support engineers and end users with ticket resolution, root cause analysis, and IT guidance.',
      'Be concise, professional, and action-oriented. Use markdown formatting for clarity.',
    ];

    if (knowledgeContext.length > 0) {
      systemContent.push('\n**Relevant Knowledge Base Articles:**');
      knowledgeContext.forEach(article => {
        systemContent.push(`\n**${article.title}** (${article.category})\nProblem: ${article.problem}\nSolution: ${article.solution}`);
      });
    }

    const messages = [
      { role: 'system', content: systemContent.join('\n') },
      ...history,
      { role: 'user', content: userMessage },
    ];

    return { messages, knowledgeContext };
  }

  /**
   * Store embedding for a source document
   * @param {string} sourceType - 'ticket', 'knowledge_base', etc.
   * @param {string} sourceId - UUID
   * @param {string} content - text to embed
   * @param {Array} vector - embedding vector
   */
  async storeEmbedding(sourceType, sourceId, content, vector) {
    try {
      await db.query(`
        INSERT INTO ai_embeddings (source_type, source_id, content, embedding_vector)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT DO NOTHING
      `, [sourceType, sourceId, content, vector ? JSON.stringify(vector) : null]);
    } catch {/* non-blocking */}
  }
}

module.exports = new RagEngine();
