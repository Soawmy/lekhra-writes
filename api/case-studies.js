const { redis } = require('./_lib/kv');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const raw = await redis(['LRANGE', 'case_studies', '0', '99']);
    const items = (raw || [])
      .map((entry) => {
        try {
          const obj = JSON.parse(entry);
          if (obj) {
            if (!Array.isArray(obj.images)) {
              obj.images = obj.imageUrl ? [obj.imageUrl] : [];
            }
            if (!obj.imageUrl && obj.images.length > 0) {
              obj.imageUrl = obj.images[0];
            }
          }
          return obj;
        } catch (err) {
          return null;
        }
      })
      .filter(Boolean);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ items });
  } catch (err) {
    // If Upstash isn't configured yet, the Work page should just fall back
    // to its empty state rather than show a broken error to visitors.
    res.status(200).json({ items: [] });
  }
};
