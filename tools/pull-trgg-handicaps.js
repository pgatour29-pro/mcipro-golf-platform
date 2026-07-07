/* ============================================================================
 * TRGG Masterscore → MyCaddiPro handicap pull  (LOCAL / TEMPORARY tool)
 * ----------------------------------------------------------------------------
 * WHY THIS EXISTS
 *   masterscoreboard.co.uk sits behind Cloudflare's "verify you are human"
 *   challenge, which blocks the server-side scraper (the daily cron has fetched
 *   0 rows for weeks). The ONLY thing that gets past Cloudflare is a real,
 *   warmed browser — i.e. Pete's own Chrome. So this runs INSIDE that browser,
 *   on the handicap-list page he's already looking at, and pushes the numbers
 *   into Supabase with the SAME match + upsert logic as the in-app paste tool
 *   (TRGGHandicapPaste.process) — so the result is identical to pasting, just
 *   scraped automatically.
 *
 * HOW TO RUN
 *   1. In your normal Chrome, log in to masterscoreboard and open the TRGG
 *      handicap list:  masterscoreboard.co.uk/results/HandicapList.php?CWID=103464
 *   2. Press F12 → Console tab.
 *   3. Paste this whole file, press Enter.
 *   4. It scrapes the table, shows you the count + a sample, and asks to
 *      confirm BEFORE writing anything. Cancel if the numbers look wrong.
 *
 * SAFETY
 *   - Dry run first: nothing is written until you click OK on the confirm.
 *   - Update-only: it updates handicaps for players already in MyCaddiPro and
 *     REPORTS anyone it couldn't match (it does NOT create new players — run the
 *     in-app paste tool if you need to add brand-new members).
 *   - Uses the same publishable/anon key + RLS path the app already uses.
 * ========================================================================== */
(async () => {
  const SUPABASE_URL = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
  const KEY = 'sb_publishable_JUC1GzlfviBUyy8LeEpSkA_Xc8tgRC9';
  const SID = '7c0e4b72-d925-44bc-afda-38259a7ba346'; // Travellers Rest Golf Group

  const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
  const log = (...a) => console.log('[TRGG pull]', ...a);
  const rest = (path, opts = {}) =>
    fetch(SUPABASE_URL + '/rest/v1/' + path, { ...opts, headers: { ...H, ...(opts.headers || {}) } });

  // order-independent name key — MUST match TRGGHandicapPaste.process exactly
  const nameKey = s => String(s == null ? '' : s).toLowerCase()
    .replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ')
    .trim().split(/\s+/).filter(Boolean).sort().join(' ');
  // "+0.4" plus-handicaps → negative number (matches paste tool)
  const toNum = raw => { raw = String(raw).trim(); const neg = raw[0] === '+';
    const n = parseFloat(raw.replace('+', '')); return isNaN(n) ? null : (neg ? -Math.abs(n) : n); };
  const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

  /* ---- 1. Scrape the handicap table from the live DOM -------------------- */
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
    // Primary: HTML table rows — name cell followed by a numeric handicap cell
    document.querySelectorAll('tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('td')].map(td => td.textContent.replace(/ /g, ' ').trim()).filter(Boolean);
      if (cells.length < 2) return;
      for (let i = 1; i < cells.length; i++) {
        if (/^[+\-]?\d+\.?\d*$/.test(cells[i])) { push(cells[i - 1] || cells[0], cells[i]); break; }
      }
    });
    // Fallback: plain-text "Name<2+ spaces>HCP" lines
    if (out.length === 0) {
      document.body.innerText.split('\n').forEach(line => {
        const m = line.trim().match(/^([A-Za-z][A-Za-z\s,.\-'()]+?)\s{2,}([+\-]?\d+\.?\d*)$/);
        if (m) push(m[1], m[2]);
      });
    }
    return out;
  }

  const entries = scrape();
  if (!entries.length) {
    alert('Found 0 handicaps on this page.\n\nMake sure you are on the TRGG handicap LIST page (not the login/menu). If the list is clearly visible, the table markup is unexpected — send Pete/Claude the page HTML and it can be tuned.');
    return;
  }
  log(`Scraped ${entries.length} players. Sample:`);
  console.table(entries.slice(0, 12).map(e => ({ name: e.name, handicap: e.num })));

  if (!confirm(`Scraped ${entries.length} players from masterscore.\n\n` +
      entries.slice(0, 6).map(e => `  ${e.name} — ${e.num}`).join('\n') +
      `\n  …\n\nApply these to MyCaddiPro now?`)) { log('Cancelled — nothing written.'); return; }

  /* ---- 2. Load MyCaddiPro profiles + aliases ---------------------------- */
  log('Loading MyCaddiPro players…');
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

  /* ---- 3. Match (order-independent, per-key 1:1 rank) ------------------- */
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
    // skip the profile PATCH when nothing changed (avoids ~1k needless writes)
    const cur = p.handicap_index == null ? null : parseFloat(p.handicap_index);
    if (cur !== e.num || (p.profile_data || {}).handicap !== e.num)
      profUpd.push({ id: p.line_user_id, hcp: e.num, pd });
    shRows.push({ golfer_id: p.line_user_id, society_id: SID, handicap_index: e.num, calculation_method: 'TRGG-masterscoreboard', last_calculated_at: stamp });
  }

  /* ---- 4. Write: profiles (changed only) + society_handicaps upsert ----- */
  log(`Matched ${matched}/${entries.length}. Writing ${profUpd.length} profile changes + ${shRows.length} society rows…`);
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
    if (!r.ok) { shErr++; log('society_handicaps upsert error', r.status, await r.text()); }
  }
  // push new master handicaps onto upcoming event registrations too (same as paste tool)
  let regSync = 0;
  try { const r = await rest('rpc/sync_upcoming_trgg_reg_handicaps', { method: 'POST', body: '{}' }); if (r.ok) regSync = await r.json(); } catch (e) {}

  const msg = `TRGG handicaps updated ✅\n\n` +
    `Scraped:   ${entries.length}\nMatched:   ${matched}\nProfiles updated: ${profUpd.length}${profErr ? ' (' + profErr + ' failed)' : ''}\n` +
    `Society rows: ${shRows.length}${shErr ? ' (errors — see console)' : ''}\nUpcoming regs synced: ${regSync}\n` +
    (lockedSkipped ? `Locked (kept manual): ${lockedSkipped}\n` : '') +
    (unmatched.length ? `\nNOT matched (${unmatched.length}) — add via the in-app paste tool:\n  ` + unmatched.slice(0, 20).join(', ') + (unmatched.length > 20 ? ' …' : '') : '\nEveryone matched.');
  log(msg); if (unmatched.length) console.log('[TRGG pull] Unmatched:', unmatched);
  alert(msg);
})();
