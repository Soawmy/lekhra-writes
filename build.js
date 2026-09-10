const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');

// Ensure fresh public directory
if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true, force: true });
}
fs.mkdirSync(publicDir, { recursive: true });

// Items to copy to public
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
  if (!fs.existsSync(src)) return;

  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.cpSync(src, dest, { recursive: true });
  } else {
    fs.copyFileSync(src, dest);
  }
});

console.log('Build completed: Generated public directory with static assets.');
