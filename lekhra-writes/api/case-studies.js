const { redis } = require('./_lib/kv');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const raw = await redis(['LRANGE', 'case_studies', '0', '99']);
    const items = (raw || [])
      .map((entry) => { try { return JSON.parse(entry); } catch (err) { return null; } })
      .filter(Boolean);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ items });
  } catch (err) {
    // If Upstash isn't configured yet, the Work page should just fall back
    // to its empty state rather than show a broken error to visitors.
    res.status(200).json({ items: [] });
  }
};
