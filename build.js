const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

try {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const itemsToCopy = [
    'index.html',
    'admin.html',
    'contact.html',
    'process.html',
    'studio.html',
    'work.html',
    'css',
    'js',
    'assets',
    'services'
  ];

  itemsToCopy.forEach((item) => {
    const src = path.join(rootDir, item);
    const dest = path.join(publicDir, item);
    copyRecursive(src, dest);
  });

  console.log('Build completed: Generated public directory with static assets.');
} catch (err) {
  console.error('Build error:', err);
  process.exit(1);
}
