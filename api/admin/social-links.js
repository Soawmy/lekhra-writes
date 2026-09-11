const { redis } = require('../_lib/kv');
const { requireAuth } = require('../_lib/auth');

const DEFAULT_SOCIAL_LINKS = [
  { id: 'instagram', platform: 'Instagram', url: 'https://instagram.com/lekhrawrites' },
  { id: 'linkedin', platform: 'LinkedIn', url: 'https://linkedin.com/company/lekhrawrites' },
  { id: 'behance', platform: 'Behance', url: 'https://behance.net/lekhrawrites' }
];

function normalizeUrl(url) {
  if (!url) return '';
  url = String(url).trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
    return 'https://' + url;
  }
  return url;
}

async function getSavedLinks() {
  const raw = await redis(['GET', 'social_links']);
  let links = null;
  if (raw !== null && raw !== undefined) {
    try {
      links = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {}
  }
  if (!Array.isArray(links)) {
    return DEFAULT_SOCIAL_LINKS.slice();
  }
  return links;
}

module.exports = async (req, res) => {
  const session = requireAuth(req);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const links = await getSavedLinks();
      res.status(200).json({ links });
      return;
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      // Option A: replace entire list (e.g. reordering or reset)
      if (Array.isArray(body.links)) {
        const cleaned = body.links.map((item, idx) => ({
          id: item.id ? String(item.id).trim() : 'link-' + Date.now().toString(36) + '-' + idx,
          platform: String(item.platform || '').trim() || 'Link',
          url: normalizeUrl(item.url)
        }));
        await redis(['SET', 'social_links', JSON.stringify(cleaned)]);
        res.status(200).json({ ok: true, links: cleaned });
        return;
      }

      // Option B: add single new link
      const { platform, url } = body;
      if (!platform || !String(platform).trim()) {
        res.status(400).json({ error: 'Platform name is required' });
        return;
      }
      if (!url || !String(url).trim()) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      const current = await getSavedLinks();
      const newLink = {
        id: 'soc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
        platform: String(platform).trim(),
        url: normalizeUrl(url)
      };

      current.push(newLink);
      await redis(['SET', 'social_links', JSON.stringify(current)]);
      res.status(200).json({ ok: true, link: newLink, links: current });
      return;
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { id, platform, url } = body;
      if (!id) {
        res.status(400).json({ error: 'Missing id' });
        return;
      }

      const current = await getSavedLinks();
      const targetIdx = current.findIndex((item) => item.id === id);
      if (targetIdx === -1) {
        res.status(404).json({ error: 'Social link not found' });
        return;
      }

      if (platform !== undefined) {
        current[targetIdx].platform = String(platform).trim() || current[targetIdx].platform;
      }
      if (url !== undefined) {
        current[targetIdx].url = normalizeUrl(url);
      }

      await redis(['SET', 'social_links', JSON.stringify(current)]);
      res.status(200).json({ ok: true, link: current[targetIdx], links: current });
      return;
    }

    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const id = body.id || (req.query && req.query.id);
      if (!id) {
        res.status(400).json({ error: 'Missing id' });
        return;
      }

      const current = await getSavedLinks();
      const filtered = current.filter((item) => item.id !== id);
      await redis(['SET', 'social_links', JSON.stringify(filtered)]);
      res.status(200).json({ ok: true, links: filtered });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin social-links error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
