// Guard for v1503: the What we offer page (public/features/) in TH / KO / JA (Pete 2026-10-11).
// 1. features/i18n.js has the same English keys in th, ko and ja, every value filled, no em or en dash.
// 2. Every visible string on the page (text, aria-label, alt) has a translation, and every key still exists
//    on the page (a stale key means the English copy changed and the translation did not).
// 3. The page loads i18n.js with ONE ?v= (head preload and the lazy loader), so a new dictionary is never
//    served from the service worker's cache-first copy of the old one.
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'public', 'features');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(dir, 'i18n.js'), 'utf8');
const fail = [];

const sb = { window: {} }; vm.runInNewContext(js, sb);
const D = sb.window.FX_I18N || {};
const langs = ['th', 'ko', 'ja'];
const keys = Object.keys(D.th || {});
if (!keys.length) fail.push('i18n.js: window.FX_I18N.th is empty');
langs.forEach(l => {
    const k = Object.keys(D[l] || {});
    if (k.length !== keys.length || k.some(x => !(x in D.th))) fail.push(l + ': key set differs from th');
    k.forEach(x => {
        const v = D[l][x];
        if (typeof v !== 'string' || !v.trim()) fail.push(l + ': empty value for "' + x + '"');
        else if (/[–—]/.test(v)) fail.push(l + ': dash in "' + v + '"');
    });
});

const dec = s => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const body = html.slice(html.indexOf('<body>'), html.lastIndexOf('<script>'));
const visible = body
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<span class="(?:ic )?ms[^"]*"[^>]*>[^<]*<\/span>/g, '')
    .replace(/<option[^>]*>[^<]*<\/option>/g, '')
    .split(/<[^>]+>/).map(dec).filter(Boolean);
const attrs = [...html.matchAll(/\s(?:aria-label|alt)="([^"]+)"/g)].map(m => dec(m[1]));
const KEEP = new Set(['MyCaddiPro', 'MyCaddi Pro', 'English.', 'ไทย.', '한국어.', '日本語.', 'CC BY-SA 4.0', '(', ',']);
[...visible, ...attrs].forEach(s => { if (!KEEP.has(s) && !(s in D.th)) fail.push('no translation for "' + s + '"'); });
const page = dec(html);
keys.forEach(k => { if (page.indexOf(k) < 0) fail.push('stale key, not on the page any more: "' + k + '"'); });

const vers = [...html.matchAll(/\/features\/i18n\.js\?v=(\w+)/g)].map(m => m[1]);
if (vers.length < 2 || new Set(vers).size !== 1) fail.push('index.html must load /features/i18n.js with one ?v= in both loaders (found ' + vers.join(', ') + ')');

if (fail.length) { console.error('features-i18n-check FAILED:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ What we offer page: ' + keys.length + ' strings in TH / KO / JA, every visible string covered, one i18n.js version');
