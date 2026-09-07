const { redis } = require('../_lib/kv');
const { requireAuth } = require('../_lib/auth');

module.exports = async (req, res) => {
  const session = requireAuth(req);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const raw = await redis(['LRANGE', 'case_studies', '0', '99']);
      const items = (raw || [])
        .map((entry) => { try { return JSON.parse(entry); } catch (err) { return null; } })
        .filter(Boolean);
      res.status(200).json({ items });
      return;
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { title, category, challenge, whatWeDid, outcome, link } = body;

      if (!title || !category) {
        res.status(400).json({ error: 'Title and category are required' });
        return;
      }

      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        title: String(title).trim(),
        category: String(category).trim(),
        challenge: challenge ? String(challenge).trim() : '',
        whatWeDid: whatWeDid ? String(whatWeDid).trim() : '',
        outcome: outcome ? String(outcome).trim() : '',
        link: link ? String(link).trim() : '',
        createdAt: new Date().toISOString()
      };

      await redis(['LPUSH', 'case_studies', JSON.stringify(entry)]);
      await redis(['LTRIM', 'case_studies', '0', '99']);
      res.status(200).json({ ok: true, item: entry });
      return;
    }

    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { id } = body;
      if (!id) {
        res.status(400).json({ error: 'Missing id' });
        return;
      }
      const raw = await redis(['LRANGE', 'case_studies', '0', '99']);
      const items = (raw || [])
        .map((entry) => { try { return JSON.parse(entry); } catch (err) { return null; } })
        .filter(Boolean);
      const target = items.find((item) => item.id === id);
      if (target) {
        await redis(['LREM', 'case_studies', '0', JSON.stringify(target)]);
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('case-studies admin error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
