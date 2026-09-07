/* ==========================================================================
   Tiny Upstash Redis REST client.
   Lives under /api/_lib — folders starting with "_" are ignored by Vercel's
   automatic file-based routing, so this never becomes a public endpoint;
   it's just a shared helper other files under /api require() directly.

   Why this exists: Vercel serverless functions have no persistent disk
   between requests (or between deployments) — anything written to a local
   file during one request is simply gone by the next one. For the admin
   dashboard to actually remember settings and past submissions, that data
   has to live somewhere outside the function itself. Upstash's free tier
   is a Redis database reachable over plain HTTPS (no drivers needed),
   which is why it's used here instead of anything Vercel-specific.
   ========================================================================== */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'REPLACE_WITH_YOUR_UPSTASH_REST_URL';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'REPLACE_WITH_YOUR_UPSTASH_REST_TOKEN';

async function redis(command) {
  if (UPSTASH_URL.indexOf('REPLACE_WITH') === 0 || UPSTASH_TOKEN.indexOf('REPLACE_WITH') === 0) {
    throw new Error(
      'Upstash Redis is not configured yet. Open api/_lib/kv.js and paste in your ' +
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN — see the "One-time setup" ' +
      'section in README.md (it takes about 2 minutes, free, no credit card).'
    );
  }

  const res = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  const data = await res.json();
  if (data.error) {
    throw new Error('Upstash error: ' + data.error);
  }
  return data.result;
}

module.exports = { redis };
