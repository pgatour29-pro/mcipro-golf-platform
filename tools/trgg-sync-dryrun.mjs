// Local-only dry run: node tools/trgg-sync-dryrun.mjs <index.ts> <page.html> <existing.json> <links.json> <YYYY-MM-DD>
// existing.json / links.json = `npx supabase db query --linked` dumps (see the 2026-09-22 session note). Nothing is written.
// Dry run of supabase/functions/sync-trgg-schedule/index.ts against a saved website page and a
// dump of the live TRGG rows. Every DB write is RECORDED, nothing is sent anywhere.
// usage: node sync_dryrun.mjs <index.ts> <page.html> <existing.json> <links.json> <todayBkk>
import fs from 'fs';
import { stripTypeScriptTypes } from 'node:module';

const [,, srcPath, htmlPath, existingPath, linksPath, today] = process.argv;
let src = fs.readFileSync(srcPath, 'utf8');
src = src.replace(/^import \{ createClient \} from .*$/m, 'const createClient = globalThis.__createClient;');
const js = stripTypeScriptTypes(src, { mode: 'strip' });

const html = fs.readFileSync(htmlPath, 'utf8');
const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8')).rows;
const links = JSON.parse(fs.readFileSync(linksPath, 'utf8')).rows || [];
const writes = [];
let nextId = 1;

function builder(table) {
  const q = { table, op: 'select', cols: '', data: null, filters: [], single: false };
  const b = {
    select(c) { if (q.op === 'select') q.cols = c; return b; },
    insert(d) { q.op = 'insert'; q.data = d; return b; },
    update(d) { q.op = 'update'; q.data = d; return b; },
    delete() { q.op = 'delete'; return b; },
    or(f) { q.filters.push(['or', f]); return b; },
    gte(k, v) { q.filters.push(['gte', k, v]); return b; },
    eq(k, v) { q.filters.push(['eq', k, v]); return b; },
    in(k, v) { q.filters.push(['in', k, v]); return b; },
    single() { q.single = true; return b; },
    then(res, rej) {
      let out = { data: null, error: null };
      if (q.op === 'select' && table === 'society_events') out.data = existing;
      else if (q.op === 'select') {
        const ids = new Set(((q.filters.find(f => f[0] === 'in') || [])[2] || []).map(String));
        out.data = links.filter(l => l.t === table && ids.has(String(l.event_id))).map(l => ({ event_id: l.event_id }));
      } else if (q.op === 'insert') {
        const id = 'NEW-' + (nextId++);
        writes.push({ op: 'INSERT', table, id, data: q.data });
        out.data = { id };
      } else {
        writes.push({ op: q.op.toUpperCase(), table, filters: q.filters.map(f => f.slice(1).join('=')), data: q.data });
      }
      return Promise.resolve(out).then(res, rej);
    },
  };
  return b;
}
globalThis.__createClient = () => ({ from: t => builder(t) });
let handler = null;
globalThis.Deno = { serve: h => { handler = h; }, env: { get: () => 'x' } };
globalThis.fetch = async () => new Response(html, { status: 200 });
// pin "today" (Bangkok) for the function's todayBkk computation
const realNow = Date.now;
Date.now = () => new Date(today + 'T03:30:00Z').getTime();

const modUrl = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
await import(modUrl);
const resp = await handler(new Request('http://local/', { method: 'POST' }));
const body = await resp.json();
Date.now = realNow;

const byId = Object.fromEntries(existing.map(r => [r.id, r]));
const WATCH = ['event_date', 'start_time', 'course_name'];
const norm = (k, v) => (k === 'start_time' ? String(v || '').slice(0, 5) : String(v ?? ''));
console.log('SUMMARY', JSON.stringify({ inserted: body.inserted, updated: body.updated, unchanged: body.unchanged, stale_removed: body.stale_removed, duplicates_removed: body.duplicates_removed, stale_kept: body.stale_kept, warnings: body.warnings, errors: body.errors }));
for (const w of writes) {
  if (w.op === 'INSERT') {
    console.log(`INSERT  ${w.data.event_date} ${w.data.start_time} "${w.data.title}" course="${w.data.course_name}" dep=${w.data.departure_time} fee=${w.data.entry_fee} max=${w.data.max_participants ?? '-'}  [LINE: new event]`);
  } else if (w.op === 'UPDATE' && w.table === 'society_events') {
    const id = (w.filters[0] || '').split('=')[1];
    const r = byId[id] || {};
    const diffs = Object.keys(w.data).filter(k => norm(k, r[k]) !== norm(k, w.data[k]) && !(k.endsWith('fee') && Number(r[k] || 0) === Number(w.data[k] || 0)));
    const line = diffs.some(k => WATCH.includes(k));
    console.log(`UPDATE  ${r.event_date} ${norm('start_time', r.start_time)} "${String(r.title).replace(/\n/g, ' / ')}"  ${diffs.map(k => `${k}: ${JSON.stringify(r[k])} -> ${JSON.stringify(w.data[k])}`).join('; ')}${line ? '  [LINE: event changed]' : '  [silent]'}`);
  } else {
    console.log(w.op, w.table, w.filters.join(' '), JSON.stringify(w.data || ''));
  }
}
