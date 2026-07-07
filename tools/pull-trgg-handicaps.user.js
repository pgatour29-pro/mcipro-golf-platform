// ==UserScript==
// @name         Pull TRGG Handicaps → MyCaddiPro
// @namespace    mycaddipro.trgg
// @version      1.0
// @description  Adds a button to the masterscore handicap list that scrapes it and pushes the handicaps into MyCaddiPro (same match + upsert as the in-app paste tool). Works on desktop AND Android.
// @match        https://www.masterscoreboard.co.uk/*
// @match        https://masterscoreboard.co.uk/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
//
// INSTALL (Android): Firefox for Android → Add-ons → add Tampermonkey (or
// Violentmonkey) → open Tampermonkey → Create/＋ new script → paste this whole
// file → Save. Then open the masterscore handicap list; a green
// "⛳ Update MyCaddiPro" button appears bottom-right — tap it.
// Desktop is the same in any browser with Tampermonkey/Violentmonkey.
(function () {
  'use strict';

  const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
  const KEY = 'sb_publishable_JUC1GzlfviBUyy8LeEpSkA_Xc8tgRC9';
  const SID = '7c0e4b72-d925-44bc-afda-38259a7ba346'; // Travellers Rest Golf Group

  const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
  const rest = (path, opts = {}) =>
    fetch(SUPABASE_URL + '/rest/v1/' + path, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  const nameKey = s => String(s == null ? '' : s).toLowerCase()
    .replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ')
    .trim().split(/\s+/).filter(Boolean).sort().join(' ');
  const toNum = raw => { raw = String(raw).trim(); const neg = raw[0] === '+';
    const n = parseFloat(raw.replace('+', '')); return isNaN(n) ? null : (neg ? -Math.abs(n) : n); };
  const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

  function scrape() {
    const out = [], seen = new Set();
    const push = (name, val) => {
      name = String(name || '').trim();
      const num = toNum(val);
      if (!name || num == null || !/[a-zA-Z]{2,}/.test(name)) return;
      if (num < -10 || num > 54) return;
      if (seen.has(name)) return; seen.add(name);
      out.push({ name, num, key: nameKey(name) });
    };
    document.querySelectorAll('tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('td')].map(td => td.textContent.replace(/ /g, ' ').trim()).filter(Boolean);
      if (cells.length < 2) return;
      for (let i = 1; i < cells.length; i++) {
        if (/^[+\-]?\d+\.?\d*$/.test(cells[i])) { push(cells[i - 1] || cells[0], cells[i]); break; }
      }
    });
    if (out.length === 0) {
      document.body.innerText.split('\n').forEach(line => {
        const m = line.trim().match(/^([A-Za-z][A-Za-z\s,.\-'()]+?)\s{2,}([+\-]?\d+\.?\d*)$/);
        if (m) push(m[1], m[2]);
      });
    }
    return out;
  }

  async function run(btn) {
    const setBtn = t => { if (btn) btn.textContent = t; };
    try {
      const entries = scrape();
      if (!entries.length) {
        alert('Found 0 handicaps on this page.\n\nMake sure you are on the TRGG handicap LIST page (not the login/menu). If the list is clearly visible, send Pete/Claude a screenshot or a row of the page and the scraper can be tuned.');
        return;
      }
      if (!confirm(`Scraped ${entries.length} players from masterscore.\n\n` +
          entries.slice(0, 6).map(e => `  ${e.name} — ${e.num}`).join('\n') +
          `\n  …\n\nApply these to MyCaddiPro now?`)) return;

      setBtn('Loading players…');
      let profs = [];
      for (let off = 0; ; off += 1000) {
        const r = await rest(`user_profiles?select=line_user_id,name,profile_data,handicap_index&limit=1000&offset=${off}`);
        if (!r.ok) { alert('Could not load players: ' + r.status + ' ' + (await r.text())); return; }
        const d = await r.json(); profs = profs.concat(d); if (d.length < 1000) break;
      }
      // MANUAL-locked handicaps (hand-set overrides / non-members that share a member's name) must not be
      // swept by the name match — exclude them so the master value lands on the real member, never on them.
      const lockedIds = new Set(); const lockedKeys = new Set();
      try { const lr = await rest('society_handicaps?select=golfer_id&calculation_method=eq.MANUAL'); if (lr.ok) (await lr.json()).forEach(x => { if (x.golfer_id) lockedIds.add(x.golfer_id); }); } catch (e) { console.warn('[TRGG pull] locked load failed', e); }
      const byKey = {}; profs.forEach(p => { const k = nameKey(p.name); if (!k) return; if (lockedIds.has(p.line_user_id)) { lockedKeys.add(k); return; } (byKey[k] = byKey[k] || []).push(p); });
      const profById = {}; profs.forEach(p => profById[p.line_user_id] = p);
      const used = {}; let lockedSkipped = 0;
      const aliasMap = {};
      try { const ar = await rest('trgg_handicap_alias?select=alias_key,golfer_id'); if (ar.ok) (await ar.json()).forEach(a => aliasMap[a.alias_key] = a.golfer_id); } catch (e) {}

      const profUpd = [], shRows = [], unmatched = []; let matched = 0;
      const stamp = new Date().toISOString();
      for (const e of entries) {
        let p = null;
        const aliasId = aliasMap[e.key];
        if (aliasId && profById[aliasId]) {
          if (lockedIds.has(aliasId)) { lockedSkipped++; continue; }   // manual override — leave it alone
          p = profById[aliasId];
        } else { const list = byKey[e.key] || []; const idx = used[e.key] || 0; if (idx < list.length) { p = list[idx]; used[e.key] = idx + 1; } }
        if (!p) { if (lockedKeys.has(e.key)) { lockedSkipped++; continue; } unmatched.push(e.name); continue; }
        matched++;
        const pd = Object.assign({}, p.profile_data || {}); pd.handicap = e.num;
        const cur = p.handicap_index == null ? null : parseFloat(p.handicap_index);
        if (cur !== e.num || (p.profile_data || {}).handicap !== e.num)
          profUpd.push({ id: p.line_user_id, hcp: e.num, pd });
        shRows.push({ golfer_id: p.line_user_id, society_id: SID, handicap_index: e.num, calculation_method: 'TRGG-masterscoreboard', last_calculated_at: stamp });
      }

      setBtn(`Writing ${profUpd.length}…`);
      let profErr = 0;
      for (const c of chunk(profUpd, 25)) {
        await Promise.all(c.map(async u => {
          const r = await rest(`user_profiles?line_user_id=eq.${encodeURIComponent(u.id)}`, {
            method: 'PATCH', headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ handicap_index: u.hcp, trgg_handicap: u.hcp, profile_data: u.pd })
          });
          if (!r.ok) profErr++;
        }));
      }
      let shErr = 0;
      for (const c of chunk(shRows, 300)) {
        const r = await rest('society_handicaps?on_conflict=golfer_id,society_id', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(c)
        });
        if (!r.ok) shErr++;
      }
      let regSync = 0;
      try { const r = await rest('rpc/sync_upcoming_trgg_reg_handicaps', { method: 'POST', body: '{}' }); if (r.ok) regSync = await r.json(); } catch (e) {}

      alert(`TRGG handicaps updated ✅\n\n` +
        `Scraped:   ${entries.length}\nMatched:   ${matched}\nProfiles updated: ${profUpd.length}${profErr ? ' (' + profErr + ' failed)' : ''}\n` +
        `Society rows: ${shRows.length}${shErr ? ' (some errors)' : ''}\nUpcoming regs synced: ${regSync}\n` +
        (unmatched.length ? `\nNOT matched (${unmatched.length}) — add via the in-app paste tool:\n  ` + unmatched.slice(0, 20).join(', ') + (unmatched.length > 20 ? ' …' : '') : '\nEveryone matched.'));
    } catch (err) {
      alert('Error: ' + (err && err.message ? err.message : err));
    } finally {
      setBtn('⛳ Update MyCaddiPro');
    }
  }

  function addButton() {
    if (document.getElementById('mcp-pull-btn') || !document.body) return;
    const b = document.createElement('button');
    b.id = 'mcp-pull-btn';
    b.type = 'button';
    b.textContent = '⛳ Update MyCaddiPro';
    b.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483647;background:#22c55e;color:#062b16;' +
      'font:700 15px/1 system-ui,Arial;border:none;border-radius:12px;padding:15px 18px;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer';
    b.addEventListener('click', () => run(b));
    document.body.appendChild(b);
  }

  addButton();
  setTimeout(addButton, 1500);
  setTimeout(addButton, 4000);
})();
