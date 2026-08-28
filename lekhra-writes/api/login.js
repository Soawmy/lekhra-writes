const crypto = require('crypto');
const { redis } = require('../lib/kv');
const { setSessionCookie } = require('../lib/auth');

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin';

function verifyPasswordHash(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(check, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { username, password } = body;
    if (!username || !password) {
      res.status(400).json({ error: 'Missing credentials' });
      return;
    }

    let settings = null;
    try {
      const raw = await redis(['GET', 'settings']);
      settings = raw ? JSON.parse(raw) : null;
    } catch (err) {
      // Upstash not configured yet, or unreachable — fall back to the
      // built-in default so login (and the setup instructions) still work.
      settings = null;
    }

    var ok = false;
    if (settings && settings.username && settings.passwordHash) {
      ok = username === settings.username && verifyPasswordHash(password, settings.passwordHash);
    } else {
      ok = username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD;
    }

    if (!ok) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    setSessionCookie(res, username);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
