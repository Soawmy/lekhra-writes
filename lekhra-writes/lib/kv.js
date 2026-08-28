/* ==========================================================================
   lib/kv.js — minimal Upstash Redis REST client
   Vercel serverless functions are stateless (nothing written to disk
   survives the next request), so the dashboard's settings and submission
   log need to live somewhere else. Upstash's free tier is a Redis database
   reachable over plain HTTPS with a token — no SDK, no build step, and it
   is a separate free service from Vercel itself (see README for the
   two-minute signup — that's the one thing beyond hosting this needs).
   ========================================================================== */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'PASTE_YOUR_UPSTASH_REST_URL_HERE';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'PASTE_YOUR_UPSTASH_REST_TOKEN_HERE';

async function redis(command) {
  if (UPSTASH_URL.indexOf('PASTE_YOUR') === 0 || UPSTASH_TOKEN.indexOf('PASTE_YOUR') === 0) {
    throw new Error('Upstash is not configured yet — see README.md for the two-minute setup.');
  }

  const response = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upstash error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.result;
}

module.exports = { redis };
