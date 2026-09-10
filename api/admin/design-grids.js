const { redis } = require('../_lib/kv');
const { requireAuth } = require('../_lib/auth');

const DEFAULT_GRIDS = [
  { id: 'grid-1', title: 'Visual Identity', imageUrl: '', defaultClass: 'a1' },
  { id: 'grid-2', title: 'Social Design', imageUrl: '', defaultClass: 'a2' },
  { id: 'grid-3', title: 'Thumbnails', imageUrl: '', defaultClass: 'a3' },
  { id: 'grid-4', title: 'Brand Assets', imageUrl: '', defaultClass: 'a4' }
];

module.exports = async (req, res) => {
  const session = requireAuth(req);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const raw = await redis(['GET', 'design_grids']);
      let grids = null;
      if (raw) {
        try {
          grids = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {}
      }
      if (!Array.isArray(grids) || grids.length === 0) {
        grids = DEFAULT_GRIDS;
      }
      res.status(200).json({ grids });
    } catch (err) {
      console.error('admin design-grids GET error:', err);
      res.status(500).json({ error: 'Could not load design grids' });
    }
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const grids = Array.isArray(body.grids) ? body.grids : null;
      if (!grids) {
        res.status(400).json({ error: 'Grids array is required' });
        return;
      }

      const cleaned = DEFAULT_GRIDS.map((def, idx) => {
        const item = grids[idx] || {};
        return {
          id: def.id,
          title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : def.title,
          imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '',
          defaultClass: def.defaultClass
        };
      });

      await redis(['SET', 'design_grids', JSON.stringify(cleaned)]);
      res.status(200).json({ ok: true, grids: cleaned });
    } catch (err) {
      console.error('admin design-grids POST error:', err);
      res.status(500).json({ error: 'Could not save design grids' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
