import config from '../config.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_HISTORY = 20;

class OpenRouterAI {
  constructor() {
    this.sessions = new Map();
  }

  async generate(userMsg, systemPrompt = null, convId = null) {
    const startTime = Date.now();

    try {
      if (!config.openrouter.apiKey) {
        throw new Error('OPENROUTER_API_KEY is not set');
      }

      let history = [];
      if (convId && this.sessions.has(convId)) {
        history = this.sessions.get(convId);
      } else if (systemPrompt) {
        history = [{ role: 'system', content: systemPrompt }];
      }

      history = [...history, { role: 'user', content: userMsg }];

      const headers = {
        Authorization: `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json'
      };

      if (config.openrouter.siteUrl) {
        headers['HTTP-Referer'] = config.openrouter.siteUrl;
      }
      if (config.openrouter.appName) {
        headers['X-Title'] = config.openrouter.appName;
      }

      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.openrouter.model,
          messages: history,
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || 'OpenRouter error');
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim() || '';

      const timeMs = Date.now() - startTime;
      const tokens = data?.usage?.total_tokens
        ? data.usage.total_tokens
        : Math.floor((userMsg.length + text.length) / 4);

      const updatedHistory = [
        ...history,
        { role: 'assistant', content: text || '...' }
      ].slice(-MAX_HISTORY);

      if (convId) {
        this.sessions.set(convId, updatedHistory);
      }

      return { text, tokens, timeMs };
    } catch (error) {
      console.error('AI Error:', error);
      return {
        text: 'عذراً، حدث خطأ في معالجة طلبك.',
        tokens: 0,
        timeMs: Date.now() - startTime
      };
    }
  }

  clearSession(convId) {
    this.sessions.delete(convId);
  }
}

export const ai = new OpenRouterAI();
