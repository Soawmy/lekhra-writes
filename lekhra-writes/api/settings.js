const crypto = require('crypto');
const { redis } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');

const DEFAULT_TO_EMAIL = process.env.TO_EMAIL || 'soawmy@gmail.com';
const DEFAULT_USERNAME = 'admin';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function getSettings() {
  const raw = await redis(['GET', 'settings']);
  return raw ? JSON.parse(raw) : { toEmail: DEFAULT_TO_EMAIL, username: DEFAULT_USERNAME, passwordHash: null };
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
      res.status(200).json({ toEmail: settings.toEmail || DEFAULT_TO_EMAIL, username: settings.username || DEFAULT_USERNAME });
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

      if (body.toEmail && String(body.toEmail).trim()) next.toEmail = String(body.toEmail).trim();
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
