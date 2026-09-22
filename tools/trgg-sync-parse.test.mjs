#!/usr/bin/env node
// TRGG website sync — a row can hold TWO events (Pete, 2026-09-22: "sometimes trgg will have 2
// events for the same day"). Runs the REAL parseScheduleHTML + the write loop from
// supabase/functions/sync-trgg-schedule/index.ts against a synthetic page with a fake DB that
// only records writes. Needs Node >= 22.13 (node:module stripTypeScriptTypes).
// Run: node tools/trgg-sync-parse.test.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stripTypeScriptTypes } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
let src = fs.readFileSync(path.join(here, '..', 'supabase', 'functions', 'sync-trgg-schedule', 'index.ts'), 'utf8');
src = src.replace(/^import \{ createClient \} from .*$/m, 'const createClient = globalThis.__createClient;');
const js = stripTypeScriptTypes(src, { mode: 'strip' });

// The shapes the live site used on 2026-09-22.
const row = (...c) => '<tr>\n' + c.map(x => `<td>${x}</td>`).join('\n') + '\n</tr>\n';
const PAGE = `<h3>September 2026</h3><table>
${row('DATE', 'DAY', 'COURSE', 'DEPARTURE', '1ST TEE', 'GREEN FEE')}
${row('18', 'FRI', 'GREEN VALLEY<br />\nTWO MAN SCRAMBLE', '09.00', '10.00', '2450')}
${row('21', 'MON', 'PATTAYA C.C.', '08.10', '09.10', '1950')}
${row('22', 'TUE', 'LAEM CHABANG (Max 15)<br />\nSIAM PLANTATION', '10.00<br />\n08.15', '11.00<br />\n09.15', '3950<br />\n4050')}
</table><h3>October 2026</h3><table>
${row('8', 'THUR', 'PHOENIX 4 GROUPS<br />\nPHOENIX 6 GROUPS', '10.30<br />\n10.45', '11.28<br />\n11.45', '2350<br />\n2350')}
${row('9', 'FRI', 'PHOENIX', '10.30<br />\n10.45', '11.28<br />\n11.45', '2350')}
</table>`;

async function run(existing) {
  const writes = []; let n = 0;
  const builder = table => {
    const q = { op: 'select', data: null, f: [] };
    const b = {
      select() { return b; }, insert(d) { q.op = 'insert'; q.data = d; return b; },
      update(d) { q.op = 'update'; q.data = d; return b; }, delete() { q.op = 'delete'; return b; },
      or() { return b; }, gte() { return b; }, single() { return b; },
      eq(k, v) { q.f.push([k, v]); return b; }, in(k, v) { q.f.push([k, v]); return b; },
      then(res, rej) {
        let data = null;
        if (q.op === 'select') data = table === 'society_events' ? existing : [];
        else if (q.op === 'insert') { data = { id: 'NEW-' + (++n) }; writes.push({ op: 'insert', ...q.data }); }
        else writes.push({ op: q.op, id: (q.f[0] || [])[1], ...(q.data || {}) });
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
    };
    return b;
  };
  globalThis.__createClient = () => ({ from: builder });
  let handler;
  globalThis.Deno = { serve: h => { handler = h; }, env: { get: () => 'x' } };
  globalThis.fetch = async () => new Response(PAGE, { status: 200 });
  const now = Date.now; Date.now = () => Date.parse('2026-09-15T03:00:00Z');
  const log = console.log; console.log = () => {};
  try {
    await import('data:text/javascript;base64,' + Buffer.from(js + '\n//' + Math.random()).toString('base64'));
    const body = await (await handler(new Request('http://t/', { method: 'POST' }))).json();
    return { body, writes };
  } finally { Date.now = now; console.log = log; }
}

let fails = 0;
const ok = (c, m) => { console.log((c ? '  OK ' : '  x  ') + m); if (!c) fails++; };
const ev = (b, date) => (b.events || []).filter(e => e.date === date);

// ── 1. fresh DB: what the parser makes of each shape ──────────────────────────────────────────
{
  const { body, writes } = await run([]);
  console.log('=== 1. parse ===');
  const d22 = ev(body, '2026-09-22');
  ok(d22.length === 2, '22 Sep: two events (got ' + d22.length + ')');
  const lc = writes.find(w => w.op === 'insert' && w.event_date === '2026-09-22' && /Laem/.test(w.course_name));
  const sp = writes.find(w => w.op === 'insert' && w.event_date === '2026-09-22' && /Siam/.test(w.course_name));
  ok(lc && lc.course_name === 'Laem Chabang International Country Club' && lc.start_time === '11:00' && lc.departure_time === '10:00' && lc.entry_fee === 3950 && lc.max_participants === 15,
     'Laem Chabang 10:00/11:00 ฿3950, max 15, "(Max 15)" out of the name');
  ok(sp && sp.course_name === 'Siam Plantation Golf Club' && sp.start_time === '09:15' && sp.departure_time === '08:15' && sp.entry_fee === 4050 && !('max_participants' in sp),
     'Siam Plantation 08:15/09:15 ฿4050, no cap written');
  const d18 = ev(body, '2026-09-18');
  ok(d18.length === 1 && /TWO MAN SCRAMBLE/.test(d18[0].type), '18 Sep: ONE event — the second line is a label, not an event');
  const d8 = writes.filter(w => w.op === 'insert' && w.event_date === '2026-10-08');
  ok(d8.length === 2 && d8.every(w => w.course_name === 'Phoenix Golf & Country Club'), '8 Oct: two Phoenix waves, both mapped to the course');
  ok(d8.map(w => w.start_time).sort().join() === '11:28,11:45', '8 Oct: tees 11:28 + 11:45');
  ok(d8.some(w => /4 groups/.test(w.description)) && d8.some(w => /6 groups/.test(w.description)), '8 Oct: group counts kept in the description');
  const d9 = writes.filter(w => w.op === 'insert' && w.event_date === '2026-10-09');
  ok(d9.length === 2, '9 Oct: one course line + two times = two waves');
  const d21 = writes.filter(w => w.op === 'insert' && w.event_date === '2026-09-21');
  ok(d21.length === 1 && d21[0].course_name === 'Pattaya Country Club', 'plain row unchanged');
}

// ── 2. one Phoenix row already exists at 11:45: the 11:28 wave must NOT re-time it ─────────────
{
  const existing = [{ id: 'P45', society_id: '7c0e4b72-d925-44bc-afda-38259a7ba346', event_date: '2026-10-08',
    course_name: 'Phoenix Golf & Country Club', title: 'TRGG - Phoenix Golf & Country Club', start_time: '11:45:00',
    departure_time: '10:45:00', entry_fee: 2350, transport_fee: 0, format: 'stableford', status: 'published',
    description: 'Green Fee: ฿2350 (incl. caddy & cart) | 6 groups', created_at: '2026-09-01', sync_source: 'trgg_website',
    organizer_override: false, max_participants: null }];
  const { writes } = await run(existing);
  console.log('=== 2. same-course waves keep their own rows ===');
  const retimed = writes.find(w => w.op === 'update' && w.id === 'P45' && w.start_time && w.start_time !== '11:45');
  ok(!retimed, 'the 11:45 row is never moved to 11:28');
  ok(writes.filter(w => w.op === 'insert' && w.event_date === '2026-10-08').map(w => w.start_time).join() === '11:28', 'only the 11:28 wave is inserted');
  ok(!writes.some(w => w.op === 'delete'), 'nothing deleted');
}

console.log(fails ? `\n${fails} FAILED` : '\nALL TESTS PASSED');
process.exit(fails ? 1 : 0);
