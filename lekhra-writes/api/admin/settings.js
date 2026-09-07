const crypto = require('crypto');
const { redis } = require('../_lib/kv');
const { requireAuth } = require('../_lib/auth');

const DEFAULT_USERNAME = 'admin';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function looksLikeEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function getSettings() {
  const raw = await redis(['GET', 'settings']);
  return raw ? JSON.parse(raw) : { emails: [], username: DEFAULT_USERNAME, passwordHash: null };
}

module.exports = async (req, res) => {
  const session = requireAuth(req);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const settings = await getSettings();
      // never send the password hash to the client
      res.status(200).json({
        emails: Array.isArray(settings.emails) ? settings.emails : [],
        username: settings.username || DEFAULT_USERNAME
      });
    } catch (err) {
      console.error('settings GET error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const current = await getSettings();
      const next = Object.assign({}, current);

      if (Array.isArray(body.emails)) {
        const cleaned = body.emails
          .map((e) => String(e || '').trim())
          .filter((e) => looksLikeEmail(e));
        next.emails = cleaned.filter((e, i) => cleaned.indexOf(e) === i); // de-duplicate
      }

      if (body.username && String(body.username).trim()) next.username = String(body.username).trim();
      if (body.password && String(body.password).trim()) next.passwordHash = hashPassword(String(body.password).trim());

      await redis(['SET', 'settings', JSON.stringify(next)]);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('settings POST error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
