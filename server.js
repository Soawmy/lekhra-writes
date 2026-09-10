const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mock API routing
const caseStudiesAdmin = require('./api/admin/case-studies');
const loginAdmin = require('./api/admin/login');
const logoutAdmin = require('./api/admin/logout');
const settingsAdmin = require('./api/admin/settings');
const submissionsAdmin = require('./api/admin/submissions');
const caseStudies = require('./api/case-studies');
const submit = require('./api/submit');

// Apply routes
app.all('/api/admin/case-studies', (req, res) => caseStudiesAdmin(req, res));
app.all('/api/admin/login', (req, res) => loginAdmin(req, res));
app.all('/api/admin/logout', (req, res) => logoutAdmin(req, res));
app.all('/api/admin/settings', (req, res) => settingsAdmin(req, res));
app.all('/api/admin/submissions', (req, res) => submissionsAdmin(req, res));
app.all('/api/case-studies', (req, res) => caseStudies(req, res));
app.all('/api/submit', (req, res) => submit(req, res));

// Serve static files
app.use(express.static(path.join(__dirname, '/')));

// Start server
app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on port 3000');
});
