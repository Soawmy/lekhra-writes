const { redis } = require('./_lib/kv');

const DEFAULT_GRIDS = [
  { id: 'grid-1', title: 'Visual Identity', imageUrl: '', defaultClass: 'a1' },
  { id: 'grid-2', title: 'Social Design', imageUrl: '', defaultClass: 'a2' },
  { id: 'grid-3', title: 'Thumbnails', imageUrl: '', defaultClass: 'a3' },
  { id: 'grid-4', title: 'Brand Assets', imageUrl: '', defaultClass: 'a4' }
];

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
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
    console.error('design-grids error:', err);
    res.status(200).json({ grids: DEFAULT_GRIDS });
  }
};
