const { redis } = require('./_lib/kv');

const DEFAULT_SOCIAL_LINKS = [
  { id: 'instagram', platform: 'Instagram', url: 'https://instagram.com/lekhrawrites' },
  { id: 'linkedin', platform: 'LinkedIn', url: 'https://linkedin.com/company/lekhrawrites' },
  { id: 'behance', platform: 'Behance', url: 'https://behance.net/lekhrawrites' }
];

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const raw = await redis(['GET', 'social_links']);
    let links = null;
    if (raw !== null && raw !== undefined) {
      try {
        links = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {}
    }

    if (!Array.isArray(links)) {
      links = DEFAULT_SOCIAL_LINKS;
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).json({ links });
  } catch (err) {
    console.error('social-links error:', err);
    res.status(200).json({ links: DEFAULT_SOCIAL_LINKS });
  }
};
