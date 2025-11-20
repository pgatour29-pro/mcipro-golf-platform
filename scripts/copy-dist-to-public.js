const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src', 'dist');
const destDir = path.resolve(__dirname, '..', 'public', 'app');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

console.log(`[copy-dist] copying from ${srcDir} to ${destDir}`);
copyRecursive(srcDir, destDir);
console.log('[copy-dist] done');

