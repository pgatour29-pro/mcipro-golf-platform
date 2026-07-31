#!/usr/bin/env node
/* Publishes the puller + regenerates the bookmarklet from the ONE source file:
 *   pull-trgg-handicaps.js  →  public/tools/pull-trgg-handicaps.js  (deployed at
 *                              https://mycaddipro.com/tools/pull-trgg-handicaps.js)
 *                           →  pull-trgg-handicaps.bookmarklet.txt  (LOADER — injects
 *                              the deployed URL, so the bookmark never goes stale)
 *                           →  install-bookmarklet.html             (drag-to-bar page)
 * Run after ANY edit to pull-trgg-handicaps.js:
 *   node tools/build-bookmarklet.js
 * The bookmarklet/userscript stopped inlining the logic in v780: a stale inlined
 * bookmarklet ran hours after the v778 lock fix and re-froze the MANUAL-locked
 * players (2026-07-31). A loader always executes whatever is deployed.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const src = path.join(dir, 'pull-trgg-handicaps.js');

// syntax-check the source before publishing it anywhere
execFileSync(process.execPath, ['--check', src], { stdio: 'inherit' });

const pubDir = path.join(dir, '..', 'public', 'tools');
fs.mkdirSync(pubDir, { recursive: true });
// read+write, not copyFileSync — the copyfile syscall EPERMs on WSL drvfs mounts
fs.writeFileSync(path.join(pubDir, 'pull-trgg-handicaps.js'), fs.readFileSync(src));

const loader = "javascript:(()=>{var s=document.createElement('script');" +
  "s.src='https://mycaddipro.com/tools/pull-trgg-handicaps.js?v='+Date.now();" +
  "s.onerror=()=>alert('Could not load the TRGG puller from mycaddipro.com \\u2014 " +
  "check the connection, or paste tools/pull-trgg-handicaps.js into the console instead.');" +
  "(document.body||document.documentElement).appendChild(s)})()";
fs.writeFileSync(path.join(dir, 'pull-trgg-handicaps.bookmarklet.txt'), loader + '\n');

const escAttr = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const html = `<!doctype html><meta charset="utf-8"><title>Install: Pull TRGG Handicaps (Chrome)</title>
<style>body{font:16px/1.6 system-ui,Arial;max-width:640px;margin:40px auto;padding:0 20px;color:#111}
.btn{display:inline-block;background:#22c55e;color:#062b16;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.2)}
ol{padding-left:20px}code{background:#f1f5f9;padding:1px 6px;border-radius:4px}.bar{background:#fff7ed;border:1px solid #fed7aa;padding:12px 16px;border-radius:10px}</style>
<h2>Install the TRGG Handicap puller &mdash; Chrome</h2>
<div class="bar">In Chrome, make sure your <b>Bookmarks bar</b> is visible first: <code>Ctrl+Shift+B</code>.</div>
<ol>
<li><b>Drag</b> the green button below up onto Chrome's bookmarks bar. (Do <i>not</i> copy&ndash;paste it into a bookmark &mdash; Chrome strips <code>javascript:</code> on paste. Drag it.)</li>
<li>Go to the masterscore <b>handicap list</b> page (logged in, past Cloudflare).</li>
<li>Click the <b>Pull TRGG Handicaps</b> bookmark. Confirm the count &rarr; done. NEW names are added to the directory automatically (you get a confirm listing them first).</li>
</ol>
<p>The bookmark is a <b>loader</b> &mdash; it always runs the latest puller straight from mycaddipro.com, so you never need to re-drag it after an update. The confirm dialog shows the puller version (currently expects <b>v780+</b>).</p>
<p style="margin:28px 0"><a class="btn" href="${escAttr(loader)}">Pull TRGG Handicaps</a> &nbsp;&larr; drag me to the bookmarks bar</p>
`;
fs.writeFileSync(path.join(dir, 'install-bookmarklet.html'), html);
fs.writeFileSync(path.join(pubDir, 'install-bookmarklet.html'), html);
console.log('Published public/tools/{pull-trgg-handicaps.js,install-bookmarklet.html} + loader bookmarklet (' + loader.length + ' chars)');
