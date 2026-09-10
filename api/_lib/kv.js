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
