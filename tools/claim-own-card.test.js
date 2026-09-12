#!/usr/bin/env node
// Regression test for the Greenwood 2026-09-12 incident: joining a live round must NOT take
// your card off whoever is actively scoring it. Extracts _claimOwnCard from public/index.html
// (no second copy to drift) and runs it against a stubbed scorecard row.
// Run: node tools/claim-own-card.test.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

const m = html.match(/ {4}async _claimOwnCard\(\) \{[\s\S]*?\n {4}\}/);
if (!m) { console.error('FAIL: _claimOwnCard not found in public/index.html'); process.exit(1); }

let fails = 0; const bad = s => { console.log('  x ' + s); fails++; };
const ME = 'U-me', OTHER = 'U-scorer';

function harness(dbOwner, localOwner, scId) {
  const toasts = [];
  const updates = [];
  const card = { controlled_by: dbOwner };
  const sb = {
    from() { return this; },
    select() { return this; },
    eq() { return this; },
    maybeSingle() { return Promise.resolve({ data: card, error: null }); },
    update(patch) { updates.push(patch); return { eq: () => Promise.resolve({ error: null }) }; },
  };
  const self = {
    demoMode: false,
    players: [{ id: ME, name: 'Me' }, { id: OTHER, name: 'Pete Park' }],
    scorecards: { [ME]: scId },
    cardOwner: localOwner ? { [ME]: localOwner } : {},
    currentPlayerId: OTHER,
    currentScore: '7',
    selfScoring: {},
    _deviceUser: () => ME,
    _ownsCard(id) { return String(this.cardOwner?.[id] || '') === String(ME); },
    _syncSelfScoringFromOwnership() {
      this.selfScoring = {};
      this.players.forEach(p => { if (!this._ownsCard(p.id)) this.selfScoring[p.id] = true; });
    },
    renderHole() {},
    async _setCardOwner(pid, owner) {
      this.cardOwner = this.cardOwner || {}; this.cardOwner[pid] = owner;
      this._syncSelfScoringFromOwnership();
      updates.push({ controlled_by: owner, via: '_setCardOwner' });
    },
  };
  const win = { SupabaseDB: { client: sb }, NotificationManager: { show: t => toasts.push(t) } };
  const fn = new Function('window', 'NotificationManager', 'console',
    'return ({ ' + m[0].replace(/^ {4}async _claimOwnCard/, 'async _claimOwnCard') + ' })'
  )(win, win.NotificationManager, console);
  self._claimOwnCard = fn._claimOwnCard;
  return { self, toasts, updates, card };
}

(async () => {
  console.log('=== 1. another device is actively scoring my card -> MUST NOT steal it ===');
  {
    const h = harness(OTHER, OTHER, 'sc-1');
    await h.self._claimOwnCard();
    if (h.updates.length) bad('wrote an ownership change anyway: ' + JSON.stringify(h.updates));
    else console.log('  OK no ownership write');
    if (String(h.self.cardOwner[ME]) !== OTHER) bad('local owner was overwritten to ' + h.self.cardOwner[ME]);
    else console.log('  OK card stays with the active scorer (cube paints RED)');
    if (!h.toasts.length || !/tap your own name/i.test(h.toasts[0])) bad('no explanation toast: ' + JSON.stringify(h.toasts));
    else console.log('  OK told the player why the keypad is inert: "' + h.toasts[0] + '"');
    if (h.self.currentPlayerId !== OTHER) bad('keypad was re-aimed at a card it cannot write');
    else console.log('  OK keypad not re-aimed');
  }

  console.log('\n=== 2. nobody holds my card -> the legitimate join still claims it ===');
  {
    const h = harness(null, null, 'sc-2');
    await h.self._claimOwnCard();
    if (String(h.self.cardOwner[ME]) !== ME) bad('did not claim an unheld card');
    else console.log('  OK claimed');
    if (!h.updates.some(u => u.controlled_by === ME)) bad('no ownership write');
    else console.log('  OK ownership written');
    if (h.self.currentPlayerId !== ME) bad('keypad not aimed at my own card');
    else console.log('  OK keypad aimed at my card, score buffer cleared');
  }

  console.log('\n=== 3. empty-string holder counts as unheld ===');
  {
    const h = harness('', null, 'sc-3');
    await h.self._claimOwnCard();
    if (String(h.self.cardOwner[ME]) !== ME) bad("'' holder blocked the claim");
    else console.log('  OK claimed');
  }

  console.log('\n=== 4. already mine -> no-op, no write ===');
  {
    const h = harness(ME, ME, 'sc-4');
    await h.self._claimOwnCard();
    if (h.updates.length) bad('redundant write: ' + JSON.stringify(h.updates));
    else console.log('  OK no write');
  }

  console.log('\n=== 5. card not in the DB yet (local_) -> claim locally, no DB read needed ===');
  {
    const h = harness(OTHER, null, 'local_123');
    await h.self._claimOwnCard();
    if (String(h.self.cardOwner[ME]) !== ME) bad('local card not claimed');
    else console.log('  OK claimed locally');
  }

  console.log('\n=== 6. I am not a player in this round -> no-op ===');
  {
    const h = harness(null, null, 'sc-6');
    h.self.players = [{ id: OTHER, name: 'Pete Park' }];
    await h.self._claimOwnCard();
    if (h.updates.length) bad('claimed a card for a non-player');
    else console.log('  OK no-op');
  }

  console.log(fails ? `\nFAILED: ${fails}` : '\nALL TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
