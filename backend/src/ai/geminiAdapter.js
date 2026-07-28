/**
 * geminiAdapter.js — Google Gemini LLM Adapter (Phase 19)
 * Set AI_PROVIDER=gemini and GEMINI_API_KEY in .env to activate.
 */

const https = require('https');

const geminiAdapter = {
  async chat(messages, options = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const model = options.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    // Convert OpenAI-style messages to Gemini format
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const conversationMsgs = messages.filter(m => m.role !== 'system');

    const contents = conversationMsgs.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = JSON.stringify({
      system_instruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
      },
    });

    return new Promise((resolve, reject) => {
      const path = `/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return reject(new Error(parsed.error.message));
            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            resolve({ content, usage: { tokens: parsed.usageMetadata?.totalTokenCount || 0 }, provider: 'gemini', model });
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  },

  async embed(text) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    const body = JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text }] } });
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return reject(new Error(parsed.error.message));
            resolve(parsed.embedding?.values || []);
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  },
};

module.exports = geminiAdapter;
