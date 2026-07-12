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
 *   - NEW names (Pete 2026-07-12): anyone on the list who isn't in MyCaddiPro is
 *     ADDED — a second confirm lists exactly who, then they get a profile +
 *     TRGG society membership + handicap, and show up in the TRGG Directory as
 *     NON-MEMBERS. A name that uniquely matches an UNLINKED trgg_members row is
 *     an existing member with no profile — that roster row is linked instead.
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
  const profUpd = [], shRows = [], newbies = []; let matched = 0;
  const stamp = new Date().toISOString();
  for (const e of entries) {
    let p = null;
    const aliasId = aliasMap[e.key];
    if (aliasId && profById[aliasId]) {
      if (lockedIds.has(aliasId)) { lockedSkipped++; continue; }   // manual override — leave it alone
      p = profById[aliasId];
    } else { const list = byKey[e.key] || []; const idx = used[e.key] || 0; if (idx < list.length) { p = list[idx]; used[e.key] = idx + 1; } }
    if (!p) { if (lockedKeys.has(e.key)) { lockedSkipped++; continue; } newbies.push(e); continue; }
    matched++;
    const pd = Object.assign({}, p.profile_data || {}); pd.handicap = e.num;
    // skip the profile PATCH when nothing changed (avoids ~1k needless writes)
    const cur = p.handicap_index == null ? null : parseFloat(p.handicap_index);
    if (cur !== e.num || (p.profile_data || {}).handicap !== e.num)
      profUpd.push({ id: p.line_user_id, hcp: e.num, pd });
    shRows.push({ golfer_id: p.line_user_id, society_id: SID, handicap_index: e.num, calculation_method: 'TRGG-masterscoreboard', last_calculated_at: stamp });
  }

  /* ---- 3b. NEW names → create them (confirm exactly who, first) ---------- */
  // Mirrors TRGGHandicapPaste: profile (TRGG-HCP-… id → shows in the TRGG Directory
  // as NON-MEMBER via get_trgg_directory_nonmembers) + society_members + handicap.
  // A name uniquely matching an UNLINKED trgg_members row = existing member with no
  // profile — link that roster row instead of leaving a non-member duplicate.
  let skippedNew = 0;
  if (newbies.length && !confirm(`${newbies.length} NEW name(s) are not in MyCaddiPro yet:\n\n  ` +
      newbies.slice(0, 15).map(x => `${x.name} — ${x.num}`).join('\n  ') + (newbies.length > 15 ? '\n  …' : '') +
      `\n\nOK = ADD them (profile + TRGG membership + handicap; they appear in the TRGG Directory as non-members).\nCancel = skip adding, just update the matched players.`)) {
    skippedNew = newbies.length; newbies.length = 0;
  }
  const newProf = [], newMem = [], memLink = [];
  if (newbies.length) {
    const memByKey = {};
    try { const mr = await rest('trgg_members?select=id,full_name,matched_user_id'); if (mr.ok) (await mr.json()).forEach(m => { if (m.matched_user_id) return; const k = nameKey(m.full_name); if (k) (memByKey[k] = memByKey[k] || []).push(m); }); } catch (e) { console.warn('[TRGG pull] roster load failed', e); }
    let seq = 0; const ts = Date.now();
    for (const e of newbies) {
      const gid = 'TRGG-HCP-' + ts + '-' + (++seq);
      newProf.push({ line_user_id: gid, name: e.name, display_name: e.name, role: 'golfer', handicap_index: e.num, trgg_handicap: e.num, profile_data: { handicap: e.num, is_manual_entry: true }, society_name: 'Travellers Rest Golf Group' });
      newMem.push({ id: crypto.randomUUID(), society_id: SID, golfer_id: gid, role: 'member', status: 'active', joined_at: stamp });
      shRows.push({ golfer_id: gid, society_id: SID, handicap_index: e.num, calculation_method: 'TRGG-masterscoreboard', last_calculated_at: stamp });
      const rows = memByKey[e.key] || [];
      if (rows.length === 1) memLink.push({ rowId: rows[0].id, gid });   // unique unlinked roster row → link it
    }
  }

  /* ---- 4. Write: new profiles + memberships + roster links, then updates - */
  log(`Matched ${matched}/${entries.length}, creating ${newProf.length}. Writing ${profUpd.length} profile changes + ${shRows.length} society rows…`);
  let newErr = 0;
  for (const c of chunk(newProf, 200)) {
    const r = await rest('user_profiles', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(c) });
    if (!r.ok) { newErr += c.length; log('new profile insert error', r.status, await r.text()); }
  }
  for (const c of chunk(newMem, 200)) {
    try { await rest('society_members', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(c) }); } catch (e) {}
  }
  let rosterLinked = 0;
  for (const l of memLink) {
    try {
      const r = await rest(`trgg_members?id=eq.${l.rowId}&matched_user_id=is.null`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ matched_user_id: l.gid })
      });
      if (r.ok && (await r.json()).length) rosterLinked++;
    } catch (e) {}
  }
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
    (newProf.length ? `Added NEW: ${newProf.length - newErr}${newErr ? ' (' + newErr + ' FAILED — see console)' : ''}${rosterLinked ? ', ' + rosterLinked + ' linked to their member record' : ''} → in the TRGG Directory as non-members:\n  ` + newbies.slice(0, 20).map(x => x.name).join(', ') + (newbies.length > 20 ? ' …' : '') + '\n' : '') +
    (skippedNew ? `New names SKIPPED (you cancelled): ${skippedNew}\n` : '') +
    `Society rows: ${shRows.length}${shErr ? ' (errors — see console)' : ''}\nUpcoming regs synced: ${regSync}\n` +
    (lockedSkipped ? `Locked (kept manual): ${lockedSkipped}\n` : '') +
    (!newProf.length && !skippedNew ? '\nEveryone matched.' : '');
  log(msg); if (newbies.length) console.log('[TRGG pull] Added new:', newbies.map(x => x.name));
  alert(msg);
})();
