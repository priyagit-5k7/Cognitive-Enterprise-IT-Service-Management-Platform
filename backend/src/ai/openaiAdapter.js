/**
 * openaiAdapter.js — OpenAI LLM Adapter (Phase 19)
 * Set AI_PROVIDER=openai and OPENAI_API_KEY in .env to activate.
 */

const https = require('https');

const openaiAdapter = {
  async chat(messages, options = {}) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const body = JSON.stringify({
      model: options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return reject(new Error(parsed.error.message));
            resolve({
              content: parsed.choices[0].message.content,
              usage: { tokens: parsed.usage?.total_tokens || 0 },
              provider: 'openai',
              model: parsed.model,
            });
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  },

  async embed(text) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const body = JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/embeddings',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return reject(new Error(parsed.error.message));
            resolve(parsed.data[0].embedding);
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  },
};

module.exports = openaiAdapter;
