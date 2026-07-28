/**
 * ollamaAdapter.js — Ollama Local LLM Adapter (Phase 19)
 * Set AI_PROVIDER=ollama and OLLAMA_BASE_URL in .env to activate.
 * Default: http://localhost:11434
 */

const http = require('http');
const https = require('https');

const ollamaAdapter = {
  _request(url, body) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;
      const bodyStr = JSON.stringify(body);
      const req = lib.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });
  },

  async chat(messages, options = {}) {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = options.model || process.env.OLLAMA_MODEL || 'llama3';
    const result = await this._request(`${baseUrl}/api/chat`, {
      model,
      messages,
      stream: false,
      options: { temperature: options.temperature || 0.7 },
    });
    return {
      content: result.message?.content || '',
      usage: { tokens: result.eval_count || 0 },
      provider: 'ollama',
      model,
    };
  },

  async embed(text) {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
    const result = await this._request(`${baseUrl}/api/embeddings`, { model, prompt: text });
    return result.embedding || [];
  },
};

module.exports = ollamaAdapter;
