// Rocky chat proxy: keeps the Groq API key secret and forwards chats.
//
// POST /chat  { messages: [{ role: "user" | "assistant", content: string }, ...] }
//   -> 200    { reply: string, gesture: "bump" | "thumbs" | "amaze" | "wave" | null }
//
// Secrets / vars (see wrangler.toml and README.md):
//   GROQ_API_KEY     secret, set with `npx wrangler secret put GROQ_API_KEY`
//   ALLOWED_ORIGINS  comma-separated list of sites allowed to call this
//   GROQ_MODEL       optional, defaults to openai/gpt-oss-120b

import { SYSTEM_PROMPT } from './prompt.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const MAX_TURNS = 12;
const MAX_CHARS = 400;
const GESTURES = ['bump', 'thumbs', 'amaze', 'wave'];

// Best-effort abuse protection (per Worker instance). Also set a spend
// limit in the Groq console.
const PER_IP_PER_MIN = 15;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    hits.set(ip, { count: 1, reset: now + 60000 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  rec.count += 1;
  return rec.count > PER_IP_PER_MIN;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

function cleanMessages(input) {
  if (!Array.isArray(input)) return null;
  const out = input
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }))
    .filter((m) => m.content)
    .slice(-MAX_TURNS);
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

// Split "... [bump]" into text + gesture, and strip anything Rocky should not show.
function parseReply(raw) {
  let text = String(raw || '').trim();
  let gesture = null;
  const m = text.match(/\[(bump|thumbs|amaze|wave)\]\s*$/i);
  if (m) {
    gesture = m[1].toLowerCase();
    text = text.slice(0, m.index).trim();
  }
  text = text
    .replace(/\[(bump|thumbs|amaze|wave)\]/gi, '')
    .replace(/^rocky:\s*/i, '')
    .replace(/[*_#`]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2669}-\u{266F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length > 280) text = text.slice(0, 277).replace(/\s+\S*$/, '') + '...';
  return { reply: text, gesture: GESTURES.includes(gesture) ? gesture : null };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return okOrigin ? new Response(null, { status: 204, headers: corsHeaders(origin) })
                      : new Response(null, { status: 403 });
    }
    if (url.pathname !== '/chat' || request.method !== 'POST') {
      return new Response('Rocky is here. Talk on website.', { status: 404 });
    }
    if (!okOrigin) return new Response('Origin not allowed', { status: 403 });
    if (!env.GROQ_API_KEY) return json({ error: 'not configured' }, 500, origin);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip)) return json({ error: 'slow down' }, 429, origin);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400, origin); }
    const messages = cleanMessages(body && body.messages);
    if (!messages) return json({ error: 'bad messages' }, 400, origin);

    let groq;
    try {
      groq = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL || DEFAULT_MODEL,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
          temperature: 0.8,
          max_completion_tokens: 600,
          reasoning_effort: 'medium',
          include_reasoning: false
        })
      });
    } catch {
      return json({ error: 'upstream unreachable' }, 502, origin);
    }
    if (!groq.ok) return json({ error: 'upstream ' + groq.status }, 502, origin);

    const data = await groq.json();
    const parsed = parseReply(data && data.choices && data.choices[0] && data.choices[0].message &&
                              data.choices[0].message.content);
    if (!parsed.reply) return json({ error: 'empty reply' }, 502, origin);
    return json(parsed, 200, origin);
  }
};
