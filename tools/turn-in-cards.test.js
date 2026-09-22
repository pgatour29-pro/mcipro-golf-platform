#!/usr/bin/env node
// v1316 — Finish turns in ONLY the cards switched on (green) on this phone. Pete 2026-09-22:
// "only whichever player's card hasn't been turned off will be turned in". Extracts the real
// methods from public/index.html (no second copy to drift) and runs them on a 4-ball:
//   me       U-me        green (mine)        → turned in
//   Alan     U-alan      red, his own phone  → NOT turned in, NOT closed (his phone finishes it)
//   Guest    MANUAL-g    red, no phone = OFF → NOT turned in, closed on my Finish
//   Tom      TRGG-t      green (I score him) → turned in
// Run: node tools/turn-in-cards.test.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

function method(sig) {
  const re = new RegExp(' {4}' + sig.replace(/[()]/g, '\\$&') + ' \\{[\\s\\S]*?\\n {4}\\}');
  const m = html.match(re);
  if (!m) { console.error('FAIL: ' + sig + ' not found in public/index.html'); process.exit(1); }
  return m[0].trim();
}
const SRC = [
  method('_canOwnDevice(playerId)'),
  method('_ownsCard(playerId)'),
  method('_turnInCards()'),
  method('_isOffCard(p)'),
  method('async _retireOffCards()'),
  method('async _abandonOwnedCards(localIds)'),
];

let fails = 0; const bad = s => { console.log('  x ' + s); fails++; };
const ok = s => console.log('  OK ' + s);
const ME = 'U' + 'a'.repeat(32), ALAN = 'U' + 'b'.repeat(32), GUEST = 'MANUAL-g', TOM = 'TRGG-t';

function harness(opts = {}) {
  const writes = [];
  // Chainable Supabase stub: every call returns the builder; awaiting it resolves by shape.
  const rows = opts.rows || [];
  function builder() {
    const q = { sel: null, upd: null, ins: [], eqs: [] };
    const b = {
      select(s) { q.sel = s; return b; },
      update(p) { q.upd = p; return b; },
      eq(k, v) { q.eqs.push([k, v]); return b; },
      in(k, v) { q.ins.push([k, v]); return b; },
      then(res, rej) {
        if (q.upd) { writes.push({ patch: q.upd, ids: (q.ins[0] || [])[1], eqs: q.eqs }); return Promise.resolve({ error: null }).then(res, rej); }
        if (q.sel && /controlled_by/.test(q.sel)) {
          const ids = new Set((q.ins[0] || [null, []])[1].map(String));
          return Promise.resolve({ data: rows.filter(r => ids.has(String(r.id))) }).then(res, rej);
        }
        return Promise.resolve({ data: rows.filter(r => r.status === 'in_progress').map(r => ({ id: r.id })) }).then(res, rej);
      },
    };
    return b;
  }
  const sb = { from: () => builder() };
  const win = { SupabaseDB: { client: sb } };
  const api = new Function('window', 'console', 'return ({ ' + SRC.join(',\n') + ' })')(win, { log() {}, warn() {} });
  const self = Object.assign(Object.create(api), {
    demoMode: false,
    scoringFormats: opts.formats || ['stableford'],
    eventId: 'ev-1', groupId: 'g-1',
    players: [{ id: ME, name: 'Me' }, { id: ALAN, name: 'Alan' }, { id: GUEST, name: 'Guest' }, { id: TOM, name: 'Tom' }],
    scorecards: { [ME]: 'sc-me', [ALAN]: 'sc-alan', [GUEST]: opts.guestLocal ? 'local_g' : 'sc-g', [TOM]: 'sc-tom' },
    cardOwner: opts.cardOwner || { [ME]: ME, [ALAN]: ALAN, [GUEST]: GUEST, [TOM]: ME },
    _deviceUser: () => ME,
    _ownerRefetchNeeded() { this._refetched = true; },
  });
  return { self, writes };
}
const ids = arr => arr.map(p => p.id).join(',');

(async () => {
  console.log('=== 1. the 4-ball: only the green cards are turned in ===');
  {
    const { self } = harness();
    const got = ids(self._turnInCards());
    if (got !== [ME, TOM].join(',')) bad('turned in ' + got); else ok('me + Tom turned in; Alan (his phone) and Guest (off) are not');
  }

  console.log('=== 2. OFF = switched to a golfer who cannot log in; a phone golfer is never "off" ===');
  {
    const { self } = harness();
    const off = self.players.filter(p => self._isOffCard(p)).map(p => p.id).join(',');
    if (off !== GUEST) bad('off cards = ' + off); else ok('only the no-phone guest reads as off');
  }

  console.log('=== 3. scramble keeps turning in the whole group (team score through every card) ===');
  {
    const { self } = harness({ formats: ['scramble'] });
    if (self._turnInCards().length !== 4) bad('scramble turned in ' + ids(self._turnInCards())); else ok('all 4');
  }

  console.log('=== 4. fail closed: an owner that never loaded is not turned in (and asks for a refetch) ===');
  {
    const { self } = harness({ cardOwner: { [ME]: ME } });
    const got = ids(self._turnInCards());
    if (got !== ME) bad('turned in ' + got);
    else if (!self._refetched) bad('no owner refetch requested');
    else ok('only my loaded card; refetch requested');
  }

  console.log('=== 5. legacy round (owner NULL in the DB) still turns everyone in ===');
  {
    const { self } = harness({ cardOwner: { [ME]: null, [ALAN]: null, [GUEST]: null, [TOM]: null } });
    if (self._turnInCards().length !== 4) bad('legacy turned in ' + ids(self._turnInCards())); else ok('all 4');
  }

  console.log('=== 6. Finish closes ONLY the off card — never Alan\'s, never ours ===');
  {
    const { self, writes } = harness();
    const n = await self._retireOffCards();
    const w = writes[0];
    if (n !== 1 || writes.length !== 1) bad('wrote ' + JSON.stringify(writes));
    else if (w.patch.status !== 'abandoned' || String(w.ids) !== 'sc-g') bad('closed ' + JSON.stringify(w));
    else if (!w.eqs.some(([k, v]) => k === 'status' && v === 'in_progress')) bad('no in_progress guard');
    else ok('abandoned sc-g only, guarded on in_progress');
  }

  console.log('=== 7. an offline (local_) off card is not sent to the DB ===');
  {
    const { self, writes } = harness({ guestLocal: true });
    await self._retireOffCards();
    if (writes.length) bad('wrote ' + JSON.stringify(writes)); else ok('nothing written');
  }

  console.log('=== 8. END abandons mine + the off card, leaves Alan\'s live card alone ===');
  {
    const rows = [
      { id: 'sc-me', player_id: ME, controlled_by: ME, status: 'in_progress' },
      { id: 'sc-alan', player_id: ALAN, controlled_by: ALAN, status: 'in_progress' },
      { id: 'sc-g', player_id: GUEST, controlled_by: GUEST, status: 'in_progress' },
      { id: 'sc-tom', player_id: TOM, controlled_by: ME, status: 'in_progress' },
    ];
    const { self, writes } = harness({ rows });
    await self._abandonOwnedCards(['sc-me', 'sc-alan', 'sc-g', 'sc-tom']);
    const hit = (writes[0] && writes[0].ids || []).slice().sort().join(',');
    if (hit !== 'sc-g,sc-me,sc-tom') bad('abandoned ' + hit); else ok('sc-me, sc-tom, sc-g — not sc-alan');
  }

  console.log('=== 9. a TRGG golfer handed to a phone-holder is NOT off (owner != player) ===');
  {
    const { self } = harness({ cardOwner: { [ME]: ME, [ALAN]: ALAN, [GUEST]: ALAN, [TOM]: ME } });
    if (self._isOffCard(self.players[2])) bad('guest held by Alan read as off'); else ok('held by Alan = his, not off');
  }

  console.log('=== 10. the real save: a blank red card no longer blocks Finish, and is not posted ===');
  {
    const { self } = harness();
    const saved = [];
    const full = {}; for (let h = 1; h <= 18; h++) full[h] = 5;
    self.scoresCache = { [ME]: { ...full }, [TOM]: { ...full } };   // Alan + Guest blank
    self.saveRoundToHistory = async p => { saved.push(p.id); return 'round-' + p.id; };
    self.courseData = { name: 'Test CC' }; self.isPrivateRound = true;
    const dist = method('async distributeRoundScores()');
    const g = { AppState: { currentUser: { lineUserId: ME } }, NotificationManager: { show() {} } };
    const win = { SupabaseDB: { ready: true, client: {} }, SocietyGolfDB: { completeScorecard: () => Promise.resolve() } };
    const fn = new Function('window', 'AppState', 'NotificationManager', 'console',
      'return ({ ' + dist + ' })')(win, g.AppState, g.NotificationManager, { log() {}, warn() {}, error() {} });
    let err = null;
    try { await fn.distributeRoundScores.call(self); } catch (e) { err = e; }
    if (err) bad('threw: ' + err.message);
    else if (saved.slice().sort().join(',') !== [ME, TOM].sort().join(',')) bad('posted ' + saved.join(','));
    else if (!self._turnedIn || self._turnedIn.size !== 2 || !self._turnedIn.has(ME) || !self._turnedIn.has(TOM)) bad('_turnedIn wrong');
    else ok('posted me + Tom only, no "Only 2 of 4 rounds saved" throw');
  }

  console.log('=== 11. a blank GREEN card still stops the save (unchanged safety net) ===');
  {
    const { self } = harness();
    const full = {}; for (let h = 1; h <= 18; h++) full[h] = 5;
    self.scoresCache = { [ME]: { ...full } };   // Tom is green but blank
    self.saveRoundToHistory = async p => 'round-' + p.id;
    self.courseData = { name: 'Test CC' }; self.isPrivateRound = true;
    const dist = method('async distributeRoundScores()');
    const fn = new Function('window', 'AppState', 'NotificationManager', 'console',
      'return ({ ' + dist + ' })')({ SupabaseDB: { ready: true, client: {} }, SocietyGolfDB: { completeScorecard: () => Promise.resolve() } },
      { currentUser: { lineUserId: ME } }, { show() {} }, { log() {}, warn() {}, error() {} });
    let err = null;
    try { await fn.distributeRoundScores.call(self); } catch (e) { err = e; }
    if (!err || !/Only 1 of 2/.test(err.message)) bad('expected "Only 1 of 2" throw, got ' + (err && err.message)); else ok('throws "Only 1 of 2 rounds saved. Missing: Tom"');
  }

  console.log(fails ? `\n${fails} FAILED` : '\nALL TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
