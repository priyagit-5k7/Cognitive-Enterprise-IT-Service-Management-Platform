/**
 * llmAdapter.js — LLM Provider Abstraction Layer (Phase 19)
 * All LLM operations go through this interface.
 * Provider can be switched without changing backend APIs or frontend code.
 */

class LLMAdapter {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'mock';
    this._adapter = null;
    this._loadAdapter();
  }

  _loadAdapter() {
    try {
      switch (this.provider) {
        case 'openai':
          this._adapter = require('./openaiAdapter');
          break;
        case 'gemini':
          this._adapter = require('./geminiAdapter');
          break;
        case 'ollama':
          this._adapter = require('./ollamaAdapter');
          break;
        default:
          this._adapter = require('./mockAdapter');
      }
      console.log(`[LLMAdapter] Loaded provider: ${this.provider}`);
    } catch (err) {
      console.warn(`[LLMAdapter] Failed to load provider "${this.provider}", falling back to mock:`, err.message);
      this._adapter = require('./mockAdapter');
      this.provider = 'mock';
    }
  }

  /**
   * Generate a chat completion
   * @param {Array} messages - Array of {role, content} objects
   * @param {Object} options - Provider-specific options
   * @returns {Promise<{content: string, usage: {tokens: number}}>}
   */
  async chat(messages, options = {}) {
    const start = Date.now();
    try {
      const result = await this._adapter.chat(messages, options);
      await this._recordMetric('chat', Date.now() - start, result.usage?.tokens || 0, true);
      return result;
    } catch (err) {
      await this._recordMetric('chat', Date.now() - start, 0, false, err.message);
      throw err;
    }
  }

  /**
   * Generate embeddings for a text
   * @param {string} text
   * @returns {Promise<number[]>} embedding vector
   */
  async embed(text) {
    const start = Date.now();
    try {
      const result = await this._adapter.embed(text);
      await this._recordMetric('embed', Date.now() - start, 0, true);
      return result;
    } catch (err) {
      await this._recordMetric('embed', Date.now() - start, 0, false, err.message);
      throw err;
    }
  }

  /**
   * Summarize text
   * @param {string} text
   * @returns {Promise<string>}
   */
  async summarize(text) {
    const messages = [
      { role: 'system', content: 'You are an IT support expert. Summarize the following ticket or document concisely in 2-3 sentences.' },
      { role: 'user', content: text },
    ];
    const result = await this.chat(messages);
    return result.content;
  }

  /**
   * Suggest resolution for a ticket
   * @param {Object} ticket - ticket object
   * @param {Array} knowledgeContext - relevant KB articles
   * @returns {Promise<string>}
   */
  async suggestResolution(ticket, knowledgeContext = []) {
    const contextStr = knowledgeContext.length
      ? '\n\nRelevant Knowledge Base:\n' + knowledgeContext.map(k => `- ${k.title}: ${k.solution}`).join('\n')
      : '';

    const messages = [
      { role: 'system', content: 'You are an expert IT support engineer. Provide clear, actionable resolution steps for IT support tickets.' },
      { role: 'user', content: `Ticket: ${ticket.title}\nDescription: ${ticket.description}\nCategory: ${ticket.category || 'Unknown'}\nPriority: ${ticket.priority}${contextStr}\n\nProvide step-by-step resolution guidance.` },
    ];
    const result = await this.chat(messages);
    return result.content;
  }

  /**
   * Analyze root cause
   * @param {Object} problem
   * @param {Array} incidents - linked incidents
   * @returns {Promise<string>}
   */
  async analyzeRootCause(problem, incidents = []) {
    const incidentSummary = incidents.map(i => `- ${i.title} (${i.status})`).join('\n');
    const messages = [
      { role: 'system', content: 'You are an ITIL problem management expert. Analyze the root cause of IT problems based on incident patterns.' },
      { role: 'user', content: `Problem: ${problem.title}\nDescription: ${problem.description}\nLinked Incidents:\n${incidentSummary || 'None'}\n\nProvide a structured root cause analysis with contributing factors and permanent resolution recommendations.` },
    ];
    const result = await this.chat(messages);
    return result.content;
  }

  /**
   * Get the current provider name
   */
  getProvider() {
    return this.provider;
  }

  async _recordMetric(operation, latencyMs, tokensUsed, success, errorMessage = null) {
    try {
      const db = require('../config/db');
      await db.query(`
        INSERT INTO ai_performance_metrics (provider, operation, latency_ms, tokens_used, success, error_message)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [this.provider, operation, latencyMs, tokensUsed, success, errorMessage]);
    } catch {/* non-blocking */}
  }
}

module.exports = new LLMAdapter();
