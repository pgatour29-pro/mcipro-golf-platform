#!/usr/bin/env node
/* Regenerates the bookmarklet variants from the ONE source file so they can't drift:
 *   pull-trgg-handicaps.js  →  pull-trgg-handicaps.bookmarklet.txt  (javascript: one-liner)
 *                           →  install-bookmarklet.html             (drag-to-bar page)
 * Run after ANY edit to pull-trgg-handicaps.js:
 *   node tools/build-bookmarklet.js          (uses npx terser to strip comments/minify)
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const src = path.join(dir, 'pull-trgg-handicaps.js');
const min = execFileSync('npx', ['--yes', 'terser', src, '--format', 'comments=false'], { encoding: 'utf8' }).trim();
if (!min.startsWith('(async') && !min.startsWith('(async()')) {
  console.error('Unexpected terser output head:', min.slice(0, 60));
  process.exit(1);
}
const bookmarklet = 'javascript:' + min;
fs.writeFileSync(path.join(dir, 'pull-trgg-handicaps.bookmarklet.txt'), bookmarklet + '\n');

const escAttr = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const html = `<!doctype html><meta charset="utf-8"><title>Install: Pull TRGG Handicaps</title>
<style>body{font:16px/1.6 system-ui,Arial;max-width:640px;margin:40px auto;padding:0 20px;color:#111}
.btn{display:inline-block;background:#22c55e;color:#062b16;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.2)}
ol{padding-left:20px}code{background:#f1f5f9;padding:1px 6px;border-radius:4px}.bar{background:#fff7ed;border:1px solid #fed7aa;padding:12px 16px;border-radius:10px}</style>
<h2>Install the TRGG Handicap puller</h2>
<div class="bar">First make sure your <b>Bookmarks bar</b> is visible: <code>Ctrl+Shift+B</code>.</div>
<ol>
<li><b>Drag</b> the green button below up onto your bookmarks bar. (Do <i>not</i> right-click &rarr; copy &mdash; drag it.)</li>
<li>Go to the masterscore <b>handicap list</b> page (logged in, past Cloudflare).</li>
<li>Click the <b>Pull TRGG Handicaps</b> bookmark. Confirm the count &rarr; done. NEW names are added to the directory automatically (you get a confirm listing them first).</li>
</ol>
<p style="margin:28px 0"><a class="btn" href="${escAttr(bookmarklet)}">Pull TRGG Handicaps</a> &nbsp;&larr; drag me to the bookmarks bar</p>
`;
fs.writeFileSync(path.join(dir, 'install-bookmarklet.html'), html);
console.log('Built bookmarklet (' + bookmarklet.length + ' chars) + install-bookmarklet.html');
