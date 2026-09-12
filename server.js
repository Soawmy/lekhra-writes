const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

const adapt = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error('API Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
};

// API endpoints matching Vercel functions
app.all('/api/case-studies', adapt(require('./api/case-studies')));
app.all('/api/design-grids', adapt(require('./api/design-grids')));
app.all('/api/social-links', adapt(require('./api/social-links')));
app.all('/api/submit', adapt(require('./api/submit')));
app.all('/api/admin/case-studies', adapt(require('./api/admin/case-studies')));
app.all('/api/admin/design-grids', adapt(require('./api/admin/design-grids')));
app.all('/api/admin/login', adapt(require('./api/admin/login')));
app.all('/api/admin/logout', adapt(require('./api/admin/logout')));
app.all('/api/admin/settings', adapt(require('./api/admin/settings')));
app.all('/api/admin/social-links', adapt(require('./api/admin/social-links')));
app.all('/api/admin/submissions', adapt(require('./api/admin/submissions')));

// Serve static directory
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Route for root and clean URLs
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dev server listening on http://0.0.0.0:${PORT}`);
});
