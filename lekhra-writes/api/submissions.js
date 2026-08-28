const { redis } = require('../lib/kv');
const { requireAuth } = require('../lib/auth');

module.exports = async (req, res) => {
  const session = requireAuth(req);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const raw = await redis(['LRANGE', 'submissions', '0', '199']);
    const items = (raw || [])
      .map((entry) => {
        try { return JSON.parse(entry); } catch (err) { return null; }
      })
      .filter(Boolean);
    res.status(200).json({ items });
  } catch (err) {
    console.error('submissions GET error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
