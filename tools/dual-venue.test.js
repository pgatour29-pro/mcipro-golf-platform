#!/usr/bin/env node
// v1318 DUAL-VENUE DAY — a society runs two events on one date (TRGG 2026-09-22: Laem Chabang +
// Siam Plantation) and a golfer plays ONE of them. Extracts SocietyGolfDB.sisterRegistrations +
// moveOffSisterEvents from public/index.html and runs them against a fake DB.
// Run: node tools/dual-venue.test.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const grab = sig => {
  const m = html.match(new RegExp(' {4}' + sig.replace(/[()]/g, '\\$&') + ' \\{[\\s\\S]*?\\n {4}\\}'));
  if (!m) { console.error('FAIL: ' + sig + ' not found'); process.exit(1); }
  return m[0].trim();
};
const SRC = [grab('async sisterRegistrations(eventId, playerId)'), grab('async moveOffSisterEvents(eventId, playerId)')];

const SOC = 'soc-trgg', LC = 'ev-lc', SP = 'ev-sp', OTHER = 'ev-other-soc';
function db(regs) {
  const events = [
    { id: LC, society_id: SOC, event_date: '2026-09-22', title: 'TRGG - Laem Chabang', course_name: 'Laem Chabang', start_time: '11:00:00' },
    { id: SP, society_id: SOC, event_date: '2026-09-22', title: 'TRGG - Siam Plantation', course_name: 'Siam Plantation', start_time: '09:15:00' },
    { id: OTHER, society_id: 'soc-joa', event_date: '2026-09-22', title: 'JOA - Phoenix', course_name: 'Phoenix', start_time: '11:00:00' },
    { id: 'ev-legacy', society_id: null, event_date: '2026-09-22', title: 'TRGG - old', course_name: 'x' },
  ];
  const q = table => {
    const f = { eq: [], neq: [], in: [] };
    const b = {
      select() { return b; },
      eq(k, v) { f.eq.push([k, v]); return b; }, neq(k, v) { f.neq.push([k, v]); return b; }, in(k, v) { f.in.push([k, v]); return b; },
      maybeSingle() { return run().then(r => ({ data: r.data[0] || null })); },
      then(res, rej) { return run().then(res, rej); },
    };
    const match = r => f.eq.every(([k, v]) => String(r[k]) === String(v)) && f.neq.every(([k, v]) => String(r[k]) !== String(v))
      && f.in.every(([k, v]) => v.map(String).includes(String(r[k])));
    const run = () => Promise.resolve({ data: (table === 'society_events' ? events : regs).filter(match) });
    return b;
  };
  return { from: q };
}
function harness(regs) {
  const deleted = [];
  const self = new Function('window', 'return ({ ' + SRC.join(',\n') + ' })')({ SupabaseDB: { client: db(regs) } });
  self.waitForSupabase = async () => {};
  self.deleteRegistration = async id => { deleted.push(id); };
  return { self, deleted };
}
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK ' : '  x  ') + m); if (!c) fails++; };

(async () => {
  console.log('=== moving Hal onto Siam takes him off Laem Chabang ===');
  {
    const { self, deleted } = harness([{ id: 'r1', event_id: LC, player_id: 'U-hal', payment_status: 'pending', amount_paid: null, checked_in: false }]);
    const out = await self.moveOffSisterEvents(SP, 'U-hal');
    ok(deleted.join() === 'r1', 'the Laem Chabang registration is deleted (through deleteRegistration = tee sheet pruned)');
    ok(out.moved.length === 1 && out.moved[0].id === LC && !out.kept.length, 'reported as moved from Laem Chabang');
  }
  console.log('=== paid / checked in over there is NEVER deleted by a move ===');
  for (const [lbl, r] of [['paid', { payment_status: 'paid' }], ['amount_paid', { amount_paid: '4200' }], ['checked in', { checked_in: true }]]) {
    const { self, deleted } = harness([Object.assign({ id: 'r2', event_id: LC, player_id: 'U-hal', payment_status: 'pending' }, r)]);
    const out = await self.moveOffSisterEvents(SP, 'U-hal');
    ok(!deleted.length && out.kept.length === 1, lbl + ' → kept for the organizer, nothing deleted');
  }
  console.log('=== only the SAME society on the SAME date is a sister ===');
  {
    const { self, deleted } = harness([
      { id: 'r3', event_id: OTHER, player_id: 'U-hal', payment_status: 'pending' },
      { id: 'r4', event_id: SP, player_id: 'U-hal', payment_status: 'pending' },
    ]);
    const out = await self.moveOffSisterEvents(SP, 'U-hal');
    ok(!deleted.length && !out.moved.length, 'a JOA event the same day, and the event itself, are untouched');
  }
  console.log('=== a society_id-less legacy event has no sisters (fail safe) ===');
  {
    const { self, deleted } = harness([{ id: 'r5', event_id: LC, player_id: 'U-hal', payment_status: 'pending' }]);
    const out = await self.moveOffSisterEvents('ev-legacy', 'U-hal');
    ok(!deleted.length && !out.moved.length, 'nothing moved off anything');
  }
  console.log('=== nobody registered elsewhere → no-op ===');
  {
    const { self, deleted } = harness([]);
    const s = await self.sisterRegistrations(SP, 'U-pete');
    ok(s.sisters.length === 1 && s.regs.length === 0 && !deleted.length, 'Siam sees Laem Chabang as its sister; no registrations');
  }
  console.log(fails ? `\n${fails} FAILED` : '\nALL TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
